import json
from decimal import Decimal
from django.db import transaction
from django.db.models import F, Sum, Avg, Q
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Restaurant, RestaurantStaff, CustomerProfile, MenuItem,
    InventoryItem, InventoryTransaction, Order, OrderItem,
    AuditLog, Notification, get_current_restaurant, set_current_restaurant
)
from api.analytics import calculate_all_metrics
from api.ai_assistant import generate_ai_recommendations
from api.sync_and_alerts import compute_real_time_alerts, process_offline_sync
from api.logger import log_structured

import re

# HELPER: Validate password strength based on standard complexity constraints
def validate_password_strength(password):
    if len(password) < 8:
        raise ValidationError("Password must be at least 8 characters long.")
    if not re.search(r"[a-z]", password):
        raise ValidationError("Password must include at least one lowercase letter.")
    if not re.search(r"[A-Z]", password):
        raise ValidationError("Password must include at least one uppercase letter.")
    if not re.search(r"[0-9]", password):
        raise ValidationError("Password must include at least one number.")

# HELPER: Get active user from cryptographic session (request.user)
def get_user_from_request(request):
    if request.user.is_authenticated:
        return request.user
    return None


def get_user_role(user, restaurant):
    if not user or not restaurant:
        return 'customer'
    try:
        staff = RestaurantStaff.objects.get(restaurant=restaurant, user=user, is_active=True)
        return staff.role
    except RestaurantStaff.DoesNotExist:
        return 'customer'


# ─── AUTHENTICATION ENDPOINTS ───────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    Signs up a new user, automatically creating a Staff or CustomerProfile.
    Supports all 9 roles: owner, admin, manager, chef, kitchen_staff, storekeeper,
    cashier, purchasing_officer, auditor, administrator, and customer.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    full_name = request.data.get('full_name', '')
    phone = request.data.get('phone', '')
    role = request.data.get('role', 'customer')
    restaurant_slug = request.data.get('restaurant_slug')

    if not email or not password:
        return Response({'error': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password_strength(password)
    except ValidationError as e:
        return Response({'error': e.message}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=email).exists():
        return Response({'error': 'User with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        user = User.objects.create_user(username=email, email=email, password=password)

        # Split customer profile from staff roles
        if role == 'customer':
            CustomerProfile.objects.create(user=user, full_name=full_name, phone=phone)
        else:
            # Must attach to a restaurant for staff roles
            if not restaurant_slug:
                return Response({'error': 'Restaurant slug is required for staff accounts.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                restaurant = Restaurant.objects.get(slug=restaurant_slug)
            except Restaurant.DoesNotExist:
                return Response({'error': 'Restaurant not found.'}, status=status.HTTP_444_NOT_FOUND)

            RestaurantStaff.objects.create(
                restaurant=restaurant,
                user=user,
                role=role,
                is_active=True
            )

    log_structured('register_user', user.id, restaurant_slug, {'role': role})

    return Response({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': role
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Logs in an existing user and returns user info with their active roles.
    """
    email = request.data.get('email')
    password = request.data.get('password')
    restaurant_slug = request.headers.get('X-Tenant-Slug') or request.data.get('restaurant_slug')

    user = authenticate(username=email, password=password)
    if not user:
        log_structured('login_failed', details={'email': email})
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    django_login(request, user)

    # Determine role
    restaurant = None
    role = 'customer'
    if restaurant_slug:
        try:
            restaurant = Restaurant.objects.get(slug=restaurant_slug)
            role = get_user_role(user, restaurant)
        except Restaurant.DoesNotExist:
            pass

    log_structured('login_success', user.id, restaurant_slug, {'role': role})

    return Response({
        'user': {
            'id': str(user.id),
            'email': user.email,
            'role': role,
            'restaurant_slug': restaurant.slug if restaurant else None
        }
    })


@api_view(['POST'])
def logout_view(request):
    user = get_user_from_request(request)
    user_id = user.id if user else None
    django_logout(request)
    log_structured('logout', user_id)
    return Response({'success': True})


@api_view(['GET'])
def session_view(request):
    """
    Returns active session information for the authenticated user.
    """
    user = get_user_from_request(request)
    if not user:
        return Response({'session': None})

    restaurant = getattr(request, 'restaurant', None)
    role = get_user_role(user, restaurant)

    return Response({
        'session': {
            'user': {
                'id': str(user.id),
                'email': user.email,
                'role': role,
                'restaurant_slug': restaurant.slug if restaurant else None
            }
        }
    })


# ─── ORDERS ENDPOINTS ────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def orders_list_create(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant/Tenant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)

    if request.method == 'GET':
        # Roles with read access: Owner, Admin, Manager, Chef, Kitchen Staff, Cashier, Waiter, Auditor
        allowed = {
            'owner', 'admin', 'manager', 'chef', 'kitchen_staff', 'kitchen', 'cashier', 'waiter', 'auditor', 'administrator'
        }
        if role != 'customer' and role not in allowed:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        orders = Order.objects.filter(restaurant=restaurant).order_by('-created_at')
        if role == 'customer':
            orders = orders.filter(customer=user)

        data = []
        for o in orders:
            items = [{
                'id': str(item.id),
                'product_id': str(item.menu_item.id),
                'name': item.menu_item.name,
                'quantity': item.quantity,
                'price': float(item.unit_price),
                'kitchen_status': item.kitchen_status
            } for item in o.items.all()]

            data.append({
                'id': str(o.id),
                'table_number': o.table_number,
                'total_amount': float(o.total),
                'status': o.status,
                'created_at': o.created_at.isoformat(),
                'order_items': items
            })

        return Response({'data': data})

    elif request.method == 'POST':
        # Roles with write access: Owner, Admin, Manager, Cashier, Waiter, Customer
        allowed_write = {'owner', 'admin', 'manager', 'cashier', 'waiter', 'customer', 'administrator'}
        if role not in allowed_write:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        table_number = request.data.get('table_number')
        items_data = request.data.get('items', [])

        if not items_data:
            return Response({'error': 'Order must contain items.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # 1. Lock inventory rows first to prevent race condition
            inventory_updates = []
            for item in items_data:
                menu_item_id = item.get('product_id')
                qty = int(item.get('quantity', 1))

                try:
                    menu_item = MenuItem.objects.get(id=menu_item_id, restaurant=restaurant)
                except MenuItem.DoesNotExist:
                    return Response({'error': f'Menu item {menu_item_id} not found.'}, status=status.HTTP_400_BAD_REQUEST)

                try:
                    inv_item = InventoryItem.objects.select_for_update().get(name=menu_item.name, restaurant=restaurant)
                    if inv_item.quantity_on_hand < qty:
                        return Response({'error': f'insufficient_stock: {inv_item.name}'}, status=status.HTTP_400_BAD_REQUEST)
                    inventory_updates.append((inv_item, qty))
                except InventoryItem.DoesNotExist:
                    pass

            # 2. Perform atomic deductions
            for inv_item, qty in inventory_updates:
                inv_item.quantity_on_hand = F('quantity_on_hand') - qty
                inv_item.save()

                InventoryTransaction.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    delta=-qty,
                    reason='sale_deduction',
                    created_by=user
                )

            # 3. Create Order
            total_amount = Decimal(sum(float(i.get('price')) * int(i.get('quantity')) for i in items_data))
            order = Order.objects.create(
                restaurant=restaurant,
                customer=user if role == 'customer' else None,
                table_number=table_number,
                total=total_amount,
                status='pending'
            )

            # 4. Create Order Items
            created_items = []
            for item in items_data:
                menu_item = MenuItem.objects.get(id=item.get('product_id'), restaurant=restaurant)
                order_item = OrderItem.objects.create(
                    restaurant=restaurant,
                    order=order,
                    menu_item=menu_item,
                    quantity=int(item.get('quantity')),
                    unit_price=Decimal(str(item.get('price'))),
                    kitchen_status='queued'
                )
                created_items.append({
                    'id': str(order_item.id),
                    'product_id': str(menu_item.id),
                    'name': menu_item.name,
                    'quantity': order_item.quantity,
                    'price': float(order_item.unit_price),
                    'kitchen_status': order_item.kitchen_status
                })

            # 5. Create Audit Log
            AuditLog.objects.create(
                restaurant=restaurant,
                actor=user,
                action='create_order',
                entity_type='order',
                entity_id=order.id,
                before=None,
                after={'order_id': str(order.id), 'total': float(total_amount)}
            )

            # 6. Create Notification
            Notification.objects.create(
                restaurant=restaurant,
                user=user,
                type='order',
                payload={'title': 'New order received', 'description': f'Order {order.id} was placed.'}
            )

        log_structured('create_order', user.id, restaurant.slug, {'order_id': str(order.id), 'total': float(total_amount)})

        return Response({
            'order': {
                'id': str(order.id),
                'table_number': order.table_number,
                'total_amount': float(order.total),
                'status': order.status,
                'created_at': order.created_at.isoformat(),
                'order_items': created_items
            }
        }, status=status.HTTP_201_CREATED)


# ─── INVENTORY ENDPOINTS ─────────────────────────────────────────────────────

@api_view(['GET', 'PATCH'])
def inventory_list_update(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)

    if request.method == 'GET':
        # Roles with read access: Owner, Admin, Manager, Chef, Kitchen Staff, Storekeeper, Cashier, Purchasing Officer, Auditor
        allowed = {
            'owner', 'admin', 'manager', 'chef', 'kitchen_staff', 'kitchen', 'storekeeper', 'cashier', 'purchasing_officer', 'auditor', 'administrator'
        }
        if role not in allowed:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        items = InventoryItem.objects.filter(restaurant=restaurant).order_by('name')
        data = []
        for item in items:
            status_str = 'in_stock'
            if item.quantity_on_hand <= 0:
                status_str = 'out_of_stock'
            elif item.quantity_on_hand <= item.reorder_threshold:
                status_str = 'low_stock'

            data.append({
                'id': str(item.id),
                'name': item.name,
                'sku': item.name.lower().replace(' ', '-'),
                'quantity': float(item.quantity_on_hand),
                'unit': item.unit,
                'threshold': float(item.reorder_threshold),
                'status': status_str,
                'updated_at': timezone.now().isoformat()
            })

        return Response({'data': data})

    elif request.method == 'PATCH':
        # Roles with write access: Owner, Admin, Manager, Storekeeper, Purchasing Officer, Administrator
        allowed_write = {'owner', 'admin', 'manager', 'storekeeper', 'purchasing_officer', 'administrator'}
        if role not in allowed_write:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        item_id = request.data.get('item_id')
        quantity_delta = float(request.data.get('quantity_delta', 0))

        if not item_id:
            return Response({'error': 'item_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                item = InventoryItem.objects.select_for_update().get(id=item_id, restaurant=restaurant)
            except InventoryItem.DoesNotExist:
                return Response({'error': 'Inventory item not found.'}, status=status.HTTP_404_NOT_FOUND)

            next_qty = float(item.quantity_on_hand) + quantity_delta
            if next_qty < 0:
                return Response({'error': 'insufficient_stock'}, status=status.HTTP_400_BAD_REQUEST)

            item.quantity_on_hand = Decimal(str(next_qty))
            item.save()

            reason = 'adjustment' if quantity_delta >= 0 else 'waste'
            InventoryTransaction.objects.create(
                restaurant=restaurant,
                inventory_item=item,
                delta=Decimal(str(quantity_delta)),
                reason=reason,
                created_by=user
            )

            AuditLog.objects.create(
                restaurant=restaurant,
                actor=user,
                action='update_inventory',
                entity_type='inventory_item',
                entity_id=item.id,
                before={'quantity': float(item.quantity_on_hand) - quantity_delta},
                after={'quantity': float(item.quantity_on_hand)}
            )

            status_str = 'in_stock'
            if item.quantity_on_hand <= 0:
                status_str = 'out_of_stock'
            elif item.quantity_on_hand <= item.reorder_threshold:
                status_str = 'low_stock'

            if status_str != 'in_stock':
                Notification.objects.create(
                    restaurant=restaurant,
                    user=user,
                    type='alert',
                    payload={
                        'title': 'Low stock alert' if status_str == 'low_stock' else 'Out of stock alert',
                        'description': f'{item.name} is now {status_str} with {float(item.quantity_on_hand)} remaining.'
                    }
                )

        log_structured('update_inventory', user.id, restaurant.slug, {'item_id': str(item.id), 'delta': quantity_delta})

        return Response({
            'id': str(item.id),
            'name': item.name,
            'quantity': float(item.quantity_on_hand),
            'unit': item.unit,
            'threshold': float(item.reorder_threshold),
            'status': status_str
        })


# ─── NOTIFICATIONS ENDPOINTS ─────────────────────────────────────────────────

@api_view(['GET'])
def notifications_list(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    notifs = Notification.objects.filter(restaurant=restaurant).order_by('-created_at')[:50]
    data = [{
        'id': str(n.id),
        'title': n.payload.get('title', 'Notification'),
        'description': n.payload.get('description', ''),
        'type': n.type,
        'unread': n.read_at is None,
        'time': n.created_at.strftime('%Y-%m-%d %H:%M:%S')
    } for n in notifs]

    return Response({'data': data})


# ─── AUDIT ENDPOINTS ─────────────────────────────────────────────────────────

@api_view(['GET'])
def audit_list(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)
    # Auditor roles: Owner, Admin, Manager, Auditor, Administrator
    allowed = {'owner', 'admin', 'manager', 'auditor', 'administrator'}
    if role not in allowed:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    logs = AuditLog.objects.filter(restaurant=restaurant).order_by('-created_at')[:100]
    data = [{
        'id': str(log.id),
        'action': log.action,
        'entity_type': log.entity_type,
        'entity_id': str(log.entity_id) if log.entity_id else None,
        'actor_email': log.actor.email if log.actor else 'System',
        'created_at': log.created_at.isoformat()
    } for log in logs]

    return Response({'data': data})


# ─── OFFLINE SYNC ENDPOINT ───────────────────────────────────────────────────

@api_view(['POST'])
def offline_sync_view(request):
    """
    Endpoint for secure, atomic Offline Mode synchronization.
    Reconciles queued orders and adjustments, preventing double-deductions.
    """
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)
    allowed = {'owner', 'admin', 'manager', 'cashier', 'waiter', 'storekeeper', 'administrator'}
    if role not in allowed:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    results = process_offline_sync(restaurant, user, request.data)
    log_structured('offline_sync', user.id, restaurant.slug, results)
    return Response(results)


# ─── ANALYTICS ENDPOINT ──────────────────────────────────────────────────────

@api_view(['GET'])
def analytics_dashboard(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)
    allowed = {'owner', 'admin', 'manager', 'auditor', 'administrator'}
    if role not in allowed:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    metrics = calculate_all_metrics(restaurant)
    return Response({'data': metrics})


# ─── AI ASSISTANT ENDPOINT ───────────────────────────────────────────────────

@api_view(['GET'])
def ai_assistant_recommendations(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)
    allowed = {'owner', 'admin', 'manager', 'chef', 'storekeeper', 'purchasing_officer', 'administrator'}
    if role not in allowed:
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    recommendations = generate_ai_recommendations(restaurant)
    return Response({'recommendations': recommendations})


# ─── ALERTS ENDPOINT ─────────────────────────────────────────────────────────

@api_view(['GET'])
def real_time_alerts(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    alerts = compute_real_time_alerts(restaurant)
    return Response({'alerts': alerts})


# ─── LOCATIONS ENDPOINTS ─────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def locations_list_create(request):
    if request.method == 'GET':
        restaurants = Restaurant.objects.all().order_by('name')
        data = [{
            'id': str(r.id),
            'name': r.name,
            'slug': r.slug,
            'subscription_tier': r.subscription_tier,
            'settings': r.settings,
            'created_at': r.created_at.isoformat()
        } for r in restaurants]
        return Response({'data': data})

    elif request.method == 'POST':
        user = get_user_from_request(request)
        if not user or not user.is_staff:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        slug = request.data.get('slug')
        subscription_tier = request.data.get('subscription_tier', 'trial')
        settings = request.data.get('settings', {})

        if not name or not slug:
            return Response({'error': 'Name and slug are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if Restaurant.objects.filter(slug=slug).exists():
            return Response({'error': 'Restaurant with this slug already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        restaurant = Restaurant.objects.create(
            name=name,
            slug=slug,
            subscription_tier=subscription_tier,
            settings=settings
        )

        return Response({
            'id': str(restaurant.id),
            'name': restaurant.name,
            'slug': restaurant.slug,
            'subscription_tier': restaurant.subscription_tier
        }, status=status.HTTP_201_CREATED)


# ─── HEALTH CHECK ENDPOINT ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'backend': 'django'
    })

import json
from decimal import Decimal
import re
from django.db import transaction
from django.db.models import F, Sum, Avg, Q
from django.contrib.auth import authenticate, login as django_login, logout as django_logout
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.http import HttpResponse

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from api.models import (
    Restaurant, RestaurantStaff, CustomerProfile, MenuItem,
    InventoryItem, InventoryTransaction, Order, OrderItem,
    AuditLog, Notification, get_current_restaurant, set_current_restaurant,
    Location, Supplier, InventoryBatch, Recipe, RecipeIngredient,
    PurchaseOrder, PurchaseOrderItem, StockMovement, StockAdjustment,
    StockAdjustmentItem, StockTransfer, StockTransferItem, WasteLog,
    InventoryCountSession, InventoryCountItem
)
from api.analytics import calculate_all_metrics
from api.ai_assistant import generate_ai_recommendations
from api.sync_and_alerts import compute_real_time_alerts, process_offline_sync
from api.logger import log_structured

# ─── UNIT CONVERSION UTILITY ───────────────────────────────────────────────

def convert_unit(quantity, from_unit, to_unit, conversion_ratio=1.0):
    quantity = Decimal(str(quantity))
    conversion_ratio = Decimal(str(conversion_ratio))
    from_unit = str(from_unit).lower().strip()
    to_unit = str(to_unit).lower().strip()

    if from_unit == to_unit:
        return quantity

    # Define standard conversion factor to baseline
    # Mass baseline: g
    mass_factors = {
        'g': Decimal('1'),
        'mg': Decimal('0.001'),
        'kg': Decimal('1000'),
        'lb': Decimal('453.59237'),
        'oz': Decimal('28.3495231'),
    }

    # Volume baseline: mL
    volume_factors = {
        'ml': Decimal('1'),
        'l': Decimal('1000'),
        'cups': Decimal('240'),
    }

    # If both units are in mass
    if from_unit in mass_factors and to_unit in mass_factors:
        qty_in_g = quantity * mass_factors[from_unit]
        return qty_in_g / mass_factors[to_unit]

    # If both units are in volume
    if from_unit in volume_factors and to_unit in volume_factors:
        qty_in_ml = quantity * volume_factors[from_unit]
        return qty_in_ml / volume_factors[to_unit]

    # Packaging baseline: pieces
    pack_units = ['case', 'cases', 'box', 'boxes', 'pack', 'packs', 'carton', 'cartons', 'tray', 'trays', 'bottle', 'bottles', 'bag', 'bags']
    if (from_unit in pack_units or to_unit in pack_units) and conversion_ratio > 0:
        is_from_pack = any(p in from_unit for p in ['case', 'box', 'pack', 'carton', 'tray', 'bottle', 'bag'])
        is_to_pack = any(p in to_unit for p in ['case', 'box', 'pack', 'carton', 'tray', 'bottle', 'bag'])
        if is_from_pack and not is_to_pack:
            return quantity * conversion_ratio
        elif not is_from_pack and is_to_pack:
            return quantity / conversion_ratio

    # Fallback: multiply by conversion ratio
    return quantity * conversion_ratio


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

        if role == 'customer':
            CustomerProfile.objects.create(user=user, full_name=full_name, phone=phone)
        else:
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
    email = request.data.get('email')
    password = request.data.get('password')
    restaurant_slug = request.headers.get('X-Tenant-Slug') or request.data.get('restaurant_slug')

    user = authenticate(username=email, password=password)
    if not user:
        log_structured('login_failed', details={'email': email})
        return Response({'error': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

    django_login(request, user)

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


# ─── ORDERS ENDPOINTS (RE-ENGINEERED WITH RECIPE DECURSIONS) ───────────────

@api_view(['GET'])
def menu_items_list(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    items = MenuItem.objects.filter(restaurant=restaurant, is_available=True)
    data = [{
        'id': str(item.id),
        'name': item.name,
        'price': float(item.price),
        'category': item.category
    } for item in items]

    return Response({'data': data})


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

                # Recipe automatic deductions check
                recipe = Recipe.objects.filter(menu_item=menu_item).first()
                if recipe:
                    for ri in recipe.ingredients.all():
                        inv_item = ri.inventory_item
                        # Select for update to lock row
                        inv_item = InventoryItem.objects.select_for_update().get(id=inv_item.id)

                        # Convert recipe ingredient quantity to stock units
                        deduct_qty_per_portion = convert_unit(ri.quantity, ri.unit, inv_item.unit, inv_item.conversion_ratio)

                        # Account for recipe-level and ingredient-level waste
                        waste_multiplier = Decimal('1') + (ri.waste_percent / Decimal('100'))
                        total_deduct_qty = deduct_qty_per_portion * Decimal(qty) * waste_multiplier

                        if inv_item.quantity_on_hand < total_deduct_qty:
                            return Response({'error': f'insufficient_stock: {inv_item.name}'}, status=status.HTTP_400_BAD_REQUEST)

                        inventory_updates.append((inv_item, total_deduct_qty, 'recipe_usage'))
                else:
                    # Fallback to direct name matching
                    try:
                        inv_item = InventoryItem.objects.select_for_update().get(name=menu_item.name, restaurant=restaurant)
                        total_deduct_qty = Decimal(qty)
                        if inv_item.quantity_on_hand < total_deduct_qty:
                            return Response({'error': f'insufficient_stock: {inv_item.name}'}, status=status.HTTP_400_BAD_REQUEST)
                        inventory_updates.append((inv_item, total_deduct_qty, 'sale_deduction'))
                    except InventoryItem.DoesNotExist:
                        pass

            # 2. Perform atomic deductions and logging
            for inv_item, qty_to_deduct, reason in inventory_updates:
                old_qty = inv_item.quantity_on_hand
                inv_item.quantity_on_hand = F('quantity_on_hand') - qty_to_deduct
                inv_item.save()

                inv_item.refresh_from_db()

                InventoryTransaction.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    delta=-qty_to_deduct,
                    reason='sale_deduction' if reason == 'recipe_usage' else 'sale_deduction',
                    created_by=user
                )

                StockMovement.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    type='recipe_usage' if reason == 'recipe_usage' else 'sale',
                    delta=-qty_to_deduct,
                    old_quantity=old_qty,
                    new_quantity=inv_item.quantity_on_hand,
                    cost=inv_item.average_cost * qty_to_deduct,
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


# ─── INVENTORY / INGREDIENT ENDPOINTS (EXPANDED TO ENTERPRISE) ─────────────

@api_view(['GET', 'POST', 'PATCH', 'DELETE'])
def inventory_list_update(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    role = get_user_role(user, restaurant)

    if request.method == 'GET':
        allowed = {
            'owner', 'admin', 'manager', 'chef', 'kitchen_staff', 'kitchen', 'storekeeper', 'cashier', 'purchasing_officer', 'auditor', 'administrator'
        }
        if role not in allowed:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        # Advanced Filtering
        queryset = InventoryItem.objects.filter(restaurant=restaurant)

        category = request.GET.get('category')
        supplier_id = request.GET.get('supplier_id')
        status_filter = request.GET.get('status')
        storage_type = request.GET.get('storage_type')
        search_query = request.GET.get('search')

        if category:
            queryset = queryset.filter(category=category)
        if supplier_id:
            queryset = queryset.filter(supplier_id=supplier_id)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if storage_type:
            queryset = queryset.filter(storage_type=storage_type)
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(sku__icontains=search_query) |
                Q(barcode__icontains=search_query) |
                Q(brand__icontains=search_query)
            )

        data = []
        for item in queryset:
            status_str = 'in_stock'
            if item.quantity_on_hand <= 0:
                status_str = 'out_of_stock'
            elif item.quantity_on_hand <= item.reorder_threshold:
                status_str = 'low_stock'

            data.append({
                'id': str(item.id),
                'name': item.name,
                'sku': item.sku or item.name.lower().replace(' ', '-'),
                'barcode': item.barcode,
                'qr_code': item.qr_code,
                'display_name': item.display_name or item.name,
                'category': item.category,
                'subcategory': item.subcategory,
                'brand': item.brand,
                'supplier_id': str(item.supplier.id) if item.supplier else None,
                'supplier_name': item.supplier.name if item.supplier else None,
                'storage_location_id': str(item.storage_location.id) if item.storage_location else None,
                'storage_type': item.storage_type,
                'shelf': item.shelf,
                'bin': item.bin,
                'rack': item.rack,
                'image_url': item.image_url,
                'description': item.description,
                'quantity': float(item.quantity_on_hand),
                'unit': item.unit,
                'purchase_unit': item.purchase_unit or item.unit,
                'recipe_unit': item.recipe_unit or item.unit,
                'conversion_ratio': float(item.conversion_ratio),
                'threshold': float(item.reorder_threshold),
                'minimum_stock': float(item.minimum_stock),
                'maximum_stock': float(item.maximum_stock),
                'reorder_point': float(item.reorder_point),
                'safety_stock': float(item.safety_stock),
                'par_level': float(item.par_level),
                'reserved_quantity': float(item.reserved_quantity),
                'available_quantity': float(item.available_quantity),
                'incoming_quantity': float(item.incoming_quantity),
                'average_cost': float(item.average_cost),
                'latest_cost': float(item.latest_cost),
                'weighted_average_cost': float(item.weighted_average_cost),
                'allergens': item.allergens,
                'nutrition': item.nutrition,
                'shelf_life_days': item.shelf_life_days,
                'status': item.status,
                'notes': item.notes,
                'stock_status': status_str
            })

        return Response({'data': data})

    elif request.method == 'POST':
        allowed_write = {'owner', 'admin', 'manager', 'storekeeper', 'purchasing_officer', 'administrator'}
        if role not in allowed_write:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        unit = request.data.get('unit')

        if not name or not unit:
            return Response({'error': 'Name and unit are required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            item = InventoryItem.objects.create(
                restaurant=restaurant,
                name=name,
                unit=unit,
                quantity_on_hand=Decimal(str(request.data.get('quantity_on_hand', 0.0))),
                reorder_threshold=Decimal(str(request.data.get('reorder_threshold', 0.0))),
                sku=request.data.get('sku'),
                barcode=request.data.get('barcode'),
                qr_code=request.data.get('qr_code') or f"QR_{name.upper().replace(' ', '_')}",
                internal_code=request.data.get('internal_code'),
                display_name=request.data.get('display_name'),
                category=request.data.get('category', 'Produce'),
                subcategory=request.data.get('subcategory'),
                brand=request.data.get('brand'),
                storage_type=request.data.get('storage_type'),
                shelf=request.data.get('shelf'),
                bin=request.data.get('bin'),
                rack=request.data.get('rack'),
                image_url=request.data.get('image_url'),
                description=request.data.get('description'),
                purchase_unit=request.data.get('purchase_unit'),
                recipe_unit=request.data.get('recipe_unit'),
                conversion_ratio=Decimal(str(request.data.get('conversion_ratio', 1.0))),
                minimum_stock=Decimal(str(request.data.get('minimum_stock', 0.0))),
                maximum_stock=Decimal(str(request.data.get('maximum_stock', 0.0))),
                reorder_point=Decimal(str(request.data.get('reorder_point', 0.0))),
                safety_stock=Decimal(str(request.data.get('safety_stock', 0.0))),
                par_level=Decimal(str(request.data.get('par_level', 0.0))),
                average_cost=Decimal(str(request.data.get('average_cost', 0.0))),
                latest_cost=Decimal(str(request.data.get('latest_cost', 0.0))),
                weighted_average_cost=Decimal(str(request.data.get('weighted_average_cost', 0.0))),
                allergens=request.data.get('allergens', []),
                nutrition=request.data.get('nutrition', {}),
                shelf_life_days=request.data.get('shelf_life_days'),
                status=request.data.get('status', 'active'),
                notes=request.data.get('notes')
            )

            # Link supplier if specified
            supplier_id = request.data.get('supplier_id')
            if supplier_id:
                item.supplier = Supplier.objects.get(id=supplier_id, restaurant=restaurant)
                item.save()

            AuditLog.objects.create(
                restaurant=restaurant,
                actor=user,
                action='create_inventory_item',
                entity_type='inventory_item',
                entity_id=item.id,
                before=None,
                after={'name': item.name, 'sku': item.sku}
            )

        return Response({'success': True, 'id': str(item.id)}, status=status.HTTP_201_CREATED)

    elif request.method == 'PATCH':
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

            old_qty = item.quantity_on_hand
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

            StockMovement.objects.create(
                restaurant=restaurant,
                inventory_item=item,
                type='adjustment' if quantity_delta >= 0 else 'waste',
                delta=Decimal(str(quantity_delta)),
                old_quantity=old_qty,
                new_quantity=item.quantity_on_hand,
                cost=item.average_cost * Decimal(abs(quantity_delta)),
                created_by=user
            )

            AuditLog.objects.create(
                restaurant=restaurant,
                actor=user,
                action='update_inventory',
                entity_type='inventory_item',
                entity_id=item.id,
                before={'quantity': float(old_qty)},
                after={'quantity': float(item.quantity_on_hand)}
            )

            status_str = 'in_stock'
            if item.quantity_on_hand <= 0:
                status_str = 'out_of_stock'
            elif item.quantity_on_hand <= item.reorder_threshold:
                status_str = 'low_stock'

        log_structured('update_inventory', user.id, restaurant.slug, {'item_id': str(item.id), 'delta': quantity_delta})

        return Response({
            'id': str(item.id),
            'name': item.name,
            'quantity': float(item.quantity_on_hand),
            'unit': item.unit,
            'threshold': float(item.reorder_threshold),
            'status': status_str
        })

    elif request.method == 'DELETE':
        allowed_write = {'owner', 'admin', 'manager', 'administrator'}
        if role not in allowed_write:
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        item_id = request.data.get('item_id')
        if not item_id:
            return Response({'error': 'item_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            item = InventoryItem.objects.get(id=item_id, restaurant=restaurant)
            item.delete()

            AuditLog.objects.create(
                restaurant=restaurant,
                actor=user,
                action='delete_inventory_item',
                entity_type='inventory_item',
                entity_id=item_id,
                before={'name': item.name},
                after=None
            )

        return Response({'success': True})


# ─── BULK CSV IMPORT / EXPORT ───────────────────────────────────────────────

@api_view(['POST'])
def inventory_import_csv(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    csv_data = request.data.get('csv_data', '')
    if not csv_data:
        return Response({'error': 'No CSV data provided.'}, status=status.HTTP_400_BAD_REQUEST)

    rows = csv_data.strip().split('\n')
    header = rows[0].split(',')

    with transaction.atomic():
        for r in rows[1:]:
            cols = r.split(',')
            if len(cols) < 3:
                continue
            name = cols[0].strip()
            unit = cols[1].strip()
            qty = Decimal(cols[2].strip() or '0')
            threshold = Decimal(cols[3].strip() or '0') if len(cols) > 3 else Decimal('0')
            sku = cols[4].strip() if len(cols) > 4 else f"SKU-{name.upper()}"

            InventoryItem.objects.update_or_create(
                restaurant=restaurant,
                name=name,
                defaults={
                    'unit': unit,
                    'quantity_on_hand': qty,
                    'reorder_threshold': threshold,
                    'sku': sku,
                    'category': 'Produce'
                }
            )

    return Response({'success': True, 'imported_count': len(rows) - 1})


@api_view(['GET'])
def inventory_export_csv(request):
    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    items = InventoryItem.objects.filter(restaurant=restaurant)
    csv_content = "Name,Unit,Quantity,Threshold,SKU\n"
    for item in items:
        csv_content += f"{item.name},{item.unit},{item.quantity_on_hand},{item.reorder_threshold},{item.sku or ''}\n"

    response = HttpResponse(csv_content, content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="inventory_export.csv"'
    return response


# ─── SUPPLIER ENDPOINTS ──────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
def suppliers_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    role = get_user_role(user, restaurant)

    if request.method == 'GET':
        suppliers = Supplier.objects.filter(restaurant=restaurant).order_by('name')
        data = [{
            'id': str(s.id),
            'name': s.name,
            'code': s.code,
            'contact_name': s.contact_name,
            'email': s.email,
            'phone': s.phone,
            'address': s.address,
            'rating': float(s.rating),
            'lead_time_days': s.lead_time_days,
            'payment_terms': s.payment_terms,
            'delivery_schedule': s.delivery_schedule,
            'minimum_order_amount': float(s.minimum_order_amount)
        } for s in suppliers]
        return Response({'data': data})

    elif request.method == 'POST':
        name = request.data.get('name')
        if not name:
            return Response({'error': 'Supplier name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            s = Supplier.objects.create(
                restaurant=restaurant,
                name=name,
                code=request.data.get('code', name[:4].upper()),
                contact_name=request.data.get('contact_name'),
                email=request.data.get('email'),
                phone=request.data.get('phone'),
                address=request.data.get('address'),
                rating=Decimal(str(request.data.get('rating', 5.0))),
                lead_time_days=int(request.data.get('lead_time_days', 3)),
                payment_terms=request.data.get('payment_terms', 'Net 30'),
                delivery_schedule=request.data.get('delivery_schedule'),
                minimum_order_amount=Decimal(str(request.data.get('minimum_order_amount', 0.0)))
            )

        return Response({'id': str(s.id), 'name': s.name}, status=status.HTTP_201_CREATED)


# ─── PURCHASE ORDER ENDPOINTS (DRAFT -> ORDERED -> RECEIVED) ───────────────

@api_view(['GET', 'POST'])
def purchase_orders_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        pos = PurchaseOrder.objects.filter(restaurant=restaurant).order_by('-created_at')
        data = []
        for po in pos:
            items = [{
                'id': str(item.id),
                'item_id': str(item.inventory_item.id),
                'name': item.inventory_item.name,
                'qty_ordered': float(item.quantity_ordered),
                'qty_received': float(item.quantity_received),
                'unit_cost': float(item.unit_cost)
            } for item in po.items.all()]

            data.append({
                'id': str(po.id),
                'po_number': po.po_number,
                'supplier_name': po.supplier.name,
                'status': po.status,
                'total_cost': float(po.total_cost),
                'expected_delivery_date': str(po.expected_delivery_date) if po.expected_delivery_date else None,
                'items': items
            })
        return Response({'data': data})

    elif request.method == 'POST':
        supplier_id = request.data.get('supplier_id')
        items_data = request.data.get('items', [])

        if not supplier_id or not items_data:
            return Response({'error': 'Supplier and items are required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            supplier = Supplier.objects.get(id=supplier_id, restaurant=restaurant)
            po_number = f"PO-{timezone.now().strftime('%Y%m%d%H%M%S')}"

            po = PurchaseOrder.objects.create(
                restaurant=restaurant,
                po_number=po_number,
                supplier=supplier,
                status='draft',
                notes=request.data.get('notes'),
                created_by=user
            )

            total_cost = Decimal('0.00')
            for item in items_data:
                inv_item = InventoryItem.objects.get(id=item['item_id'], restaurant=restaurant)
                qty = Decimal(str(item['qty']))
                cost = Decimal(str(item['unit_cost']))
                item_total = qty * cost

                PurchaseOrderItem.objects.create(
                    restaurant=restaurant,
                    purchase_order=po,
                    inventory_item=inv_item,
                    quantity_ordered=qty,
                    unit_cost=cost,
                    total_cost=item_total
                )
                total_cost += item_total

            po.total_cost = total_cost
            po.save()

        return Response({'success': True, 'id': str(po.id), 'po_number': po_number}, status=status.HTTP_201_CREATED)


@api_view(['POST'])
def purchase_order_action(request, pk):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    action = request.data.get('action') # submit, approve, receive
    po = PurchaseOrder.objects.get(id=pk, restaurant=restaurant)

    with transaction.atomic():
        if action == 'submit':
            po.status = 'submitted'
        elif action == 'approve':
            po.status = 'approved'
            po.approved_by = user
        elif action == 'order':
            po.status = 'ordered'
        elif action == 'receive':
            # Receive PO fully and update inventory on-hand!
            po.status = 'received'
            for item in po.items.all():
                item.quantity_received = item.quantity_ordered
                item.save()

                # Lock and update inventory
                inv_item = InventoryItem.objects.select_for_update().get(id=item.inventory_item.id)
                old_qty = inv_item.quantity_on_hand
                inv_item.quantity_on_hand = F('quantity_on_hand') + item.quantity_ordered
                inv_item.latest_cost = item.unit_cost

                # Weighted average cost update
                total_qty = old_qty + item.quantity_ordered
                if total_qty > 0:
                    inv_item.average_cost = ((old_qty * inv_item.average_cost) + (item.quantity_ordered * item.unit_cost)) / total_qty

                inv_item.save()
                inv_item.refresh_from_db()

                # Record stock movement
                StockMovement.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    type='receiving',
                    delta=item.quantity_ordered,
                    old_quantity=old_qty,
                    new_quantity=inv_item.quantity_on_hand,
                    cost=item.total_cost,
                    created_by=user
                )

                # Create Expiring batch/lot automatically
                InventoryBatch.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    batch_number=f"BATCH-{timezone.now().strftime('%Y%H%M')}",
                    quantity=item.quantity_ordered,
                    expiry_date=timezone.now().date() + timezone.timedelta(days=inv_item.shelf_life_days or 30)
                )

        po.save()

    return Response({'success': True, 'status': po.status})


# ─── STOCK TRANSFERS (MULTI-LOCATION WAREHOUSING) ─────────────────────────

@api_view(['GET', 'POST'])
def stock_transfers_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        transfers = StockTransfer.objects.filter(restaurant=restaurant).order_by('-created_at')
        data = []
        for t in transfers:
            items = [{
                'item_name': item.inventory_item.name,
                'qty_requested': float(item.quantity_requested),
                'qty_transferred': float(item.quantity_transferred)
            } for item in t.items.all()]

            data.append({
                'id': str(t.id),
                'transfer_number': t.transfer_number,
                'source': t.source_location.name,
                'destination': t.destination_location.name,
                'status': t.status,
                'items': items
            })
        return Response({'data': data})

    elif request.method == 'POST':
        source_id = request.data.get('source_id')
        destination_id = request.data.get('destination_id')
        items_data = request.data.get('items', [])

        with transaction.atomic():
            source = Location.objects.get(id=source_id, restaurant=restaurant)
            destination = Location.objects.get(id=destination_id, restaurant=restaurant)
            t_number = f"TR-{timezone.now().strftime('%Y%m%d%H%M%S')}"

            transfer = StockTransfer.objects.create(
                restaurant=restaurant,
                transfer_number=t_number,
                source_location=source,
                destination_location=destination,
                status='requested',
                created_by=user
            )

            for item in items_data:
                inv_item = InventoryItem.objects.get(id=item['item_id'], restaurant=restaurant)
                StockTransferItem.objects.create(
                    restaurant=restaurant,
                    stock_transfer=transfer,
                    inventory_item=inv_item,
                    quantity_requested=Decimal(str(item['qty'])),
                    quantity_transferred=Decimal(str(item['qty']))
                )

        return Response({'success': True, 'id': str(transfer.id), 'transfer_number': t_number})


@api_view(['POST'])
def stock_transfer_action(request, pk):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_411_LENGTH_REQUIRED)

    action = request.data.get('action') # approve, ship, receive
    transfer = StockTransfer.objects.get(id=pk, restaurant=restaurant)

    with transaction.atomic():
        if action == 'receive':
            transfer.status = 'received'
            for item in transfer.items.all():
                # For demonstration, in multi-location, items arrive at destination.
                # If central tracking, we deduct from source location and add to destination
                # Here we simulate adding to on-hand stock:
                inv_item = InventoryItem.objects.select_for_update().get(id=item.inventory_item.id)
                old_qty = inv_item.quantity_on_hand
                inv_item.quantity_on_hand = F('quantity_on_hand') + item.quantity_requested
                inv_item.save()

                StockMovement.objects.create(
                    restaurant=restaurant,
                    inventory_item=inv_item,
                    type='transfer',
                    delta=item.quantity_requested,
                    old_quantity=old_qty,
                    new_quantity=inv_item.quantity_on_hand,
                    created_by=user
                )
        elif action == 'approve':
            transfer.status = 'approved'
        elif action == 'ship':
            transfer.status = 'shipped'

        transfer.save()

    return Response({'success': True, 'status': transfer.status})


# ─── RECIPE & PLATE COSTING ENDPOINTS ──────────────────────────────────────

@api_view(['GET', 'POST'])
def recipes_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        recipes = Recipe.objects.filter(restaurant=restaurant)
        data = []
        for r in recipes:
            ingredients = [{
                'id': str(ri.id),
                'item_id': str(ri.inventory_item.id),
                'name': ri.inventory_item.name,
                'qty': float(ri.quantity),
                'unit': ri.unit,
                'cost': float(ri.inventory_item.average_cost * ri.quantity)
            } for ri in r.ingredients.all()]

            # Plate Cost Calculations
            total_plate_cost = sum(i['cost'] for i in ingredients)
            margin = float(r.menu_item.price) - total_plate_cost
            margin_percent = (margin / float(r.menu_item.price)) * 100 if r.menu_item.price > 0 else 0

            data.append({
                'id': str(r.id),
                'menu_item_name': r.menu_item.name,
                'menu_item_price': float(r.menu_item.price),
                'portion_size': r.portion_size,
                'cost_per_portion': float(total_plate_cost),
                'margin': margin,
                'margin_percent': margin_percent,
                'ingredients': ingredients
            })
        return Response({'data': data})

    elif request.method == 'POST':
        menu_item_id = request.data.get('menu_item_id')
        ingredients_data = request.data.get('ingredients', [])

        if not menu_item_id or not ingredients_data:
            return Response({'error': 'Menu item and ingredients are required.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            menu_item = MenuItem.objects.get(id=menu_item_id, restaurant=restaurant)
            recipe, _ = Recipe.objects.get_or_create(restaurant=restaurant, menu_item=menu_item)

            # Clear existing recipe ingredients
            recipe.ingredients.all().delete()

            total_cost = Decimal('0.00')
            for ing in ingredients_data:
                inv_item = InventoryItem.objects.get(id=ing['item_id'], restaurant=restaurant)
                qty = Decimal(str(ing['qty']))
                unit = ing.get('unit', inv_item.unit)

                RecipeIngredient.objects.create(
                    restaurant=restaurant,
                    recipe=recipe,
                    inventory_item=inv_item,
                    quantity=qty,
                    unit=unit
                )
                total_cost += inv_item.average_cost * qty

            recipe.cost_per_portion = total_cost
            recipe.save()

        return Response({'success': True, 'id': str(recipe.id)})


# ─── WASTE MANAGEMENT ENDPOINTS ─────────────────────────────────────────────

@api_view(['GET', 'POST'])
def waste_logs_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        logs = WasteLog.objects.filter(restaurant=restaurant).order_by('-created_at')
        data = [{
            'id': str(l.id),
            'item_name': l.inventory_item.name,
            'qty': float(l.quantity),
            'cost': float(l.cost),
            'reason_code': l.reason_code,
            'responsible': l.employee_responsible.email if l.employee_responsible else 'System',
            'created_at': l.created_at.isoformat()
        } for l in logs]
        return Response({'data': data})

    elif request.method == 'POST':
        item_id = request.data.get('item_id')
        qty = Decimal(str(request.data.get('quantity', 0.0)))
        reason = request.data.get('reason_code', 'spoilage')

        with transaction.atomic():
            inv_item = InventoryItem.objects.select_for_update().get(id=item_id, restaurant=restaurant)
            old_qty = inv_item.quantity_on_hand
            inv_item.quantity_on_hand = F('quantity_on_hand') - qty
            inv_item.save()

            cost = inv_item.average_cost * qty

            w_log = WasteLog.objects.create(
                restaurant=restaurant,
                inventory_item=inv_item,
                quantity=qty,
                cost=cost,
                reason_code=reason,
                employee_responsible=user
            )

            # Log to Stock movement
            StockMovement.objects.create(
                restaurant=restaurant,
                inventory_item=inv_item,
                type='waste',
                delta=-qty,
                old_quantity=old_qty,
                new_quantity=inv_item.quantity_on_hand,
                cost=cost,
                reason_code=reason,
                created_by=user
            )

        return Response({'success': True, 'id': str(w_log.id), 'cost': float(cost)})


# ─── INVENTORY CYCLE & PHYSICAL COUNTING (WITH VARIANCE DETECTION) ─────────

@api_view(['GET', 'POST'])
def count_sessions_list_create(request):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    if request.method == 'GET':
        sessions = InventoryCountSession.objects.filter(restaurant=restaurant).order_by('-created_at')
        data = []
        for s in sessions:
            items = [{
                'id': str(item.id),
                'item_name': item.inventory_item.name,
                'expected': float(item.expected_quantity),
                'actual': float(item.actual_quantity) if item.actual_quantity is not None else None,
                'variance': float(item.variance) if item.variance is not None else None
            } for item in s.items.all()]

            data.append({
                'id': str(s.id),
                'count_number': s.count_number,
                'type': s.type,
                'status': s.status,
                'items': items
            })
        return Response({'data': data})

    elif request.method == 'POST':
        c_type = request.data.get('type', 'cycle')
        with transaction.atomic():
            count_number = f"CNT-{timezone.now().strftime('%Y%m%d%H%M%S')}"
            session = InventoryCountSession.objects.create(
                restaurant=restaurant,
                count_number=count_number,
                type=c_type,
                status='scheduled',
                created_by=user
            )

            # Auto-populate all active inventory items
            items = InventoryItem.objects.filter(restaurant=restaurant, status='active')
            for item in items:
                InventoryCountItem.objects.create(
                    restaurant=restaurant,
                    count_session=session,
                    inventory_item=item,
                    expected_quantity=item.quantity_on_hand
                )

        return Response({'success': True, 'id': str(session.id), 'count_number': count_number})


@api_view(['POST'])
def count_session_action(request, pk):
    user = get_user_from_request(request)
    restaurant = getattr(request, 'restaurant', None)
    if not user or not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    action = request.data.get('action') # submit_counts, approve
    session = InventoryCountSession.objects.get(id=pk, restaurant=restaurant)

    with transaction.atomic():
        if action == 'submit_counts':
            counts = request.data.get('counts', {}) # { item_id: actual_qty }
            session.status = 'completed'
            for item in session.items.all():
                actual = counts.get(str(item.inventory_item.id))
                if actual is not None:
                    item.actual_quantity = Decimal(str(actual))
                    item.variance = item.actual_quantity - item.expected_quantity
                    item.save()
            session.save()

        elif action == 'approve':
            session.status = 'approved'
            session.approved_by = user
            # Adjust inventory on-hand to match actual counts!
            for item in session.items.all():
                if item.actual_quantity is not None and item.variance != 0:
                    inv_item = InventoryItem.objects.select_for_update().get(id=item.inventory_item.id)
                    old_qty = inv_item.quantity_on_hand
                    inv_item.quantity_on_hand = item.actual_quantity
                    inv_item.save()

                    # Record stock adjustment
                    StockMovement.objects.create(
                        restaurant=restaurant,
                        inventory_item=inv_item,
                        type='adjustment',
                        delta=item.variance,
                        old_quantity=old_qty,
                        new_quantity=inv_item.quantity_on_hand,
                        reason_code='count_variance',
                        created_by=user
                    )
            session.save()

    return Response({'success': True, 'status': session.status})


# ─── BARCODE & QR CAMERA CODE SCANNER ────────────────────────────────────────

@api_view(['GET'])
def barcode_scan_view(request):
    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    code = request.GET.get('code')
    if not code:
        return Response({'error': 'Barcode or QR code is required.'}, status=status.HTTP_400_BAD_REQUEST)

    item = InventoryItem.objects.filter(
        Q(barcode=code) | Q(qr_code=code) | Q(sku=code),
        restaurant=restaurant
    ).first()

    if not item:
        return Response({'error': 'Item not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'id': str(item.id),
        'name': item.name,
        'sku': item.sku,
        'quantity': float(item.quantity_on_hand),
        'unit': item.unit,
        'average_cost': float(item.average_cost)
    })


# ─── GLOBAL SEARCH ENGINE ───────────────────────────────────────────────────

@api_view(['GET'])
def global_search_view(request):
    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    q = request.GET.get('q', '').strip()
    if not q:
        return Response({'data': []})

    # Search across multi-tables
    items = InventoryItem.objects.filter(Q(name__icontains=q) | Q(sku__icontains=q), restaurant=restaurant)[:5]
    suppliers = Supplier.objects.filter(Q(name__icontains=q) | Q(contact_name__icontains=q), restaurant=restaurant)[:5]
    pos = PurchaseOrder.objects.filter(po_number__icontains=q, restaurant=restaurant)[:5]
    recipes = Recipe.objects.filter(menu_item__name__icontains=q, restaurant=restaurant)[:5]

    results = []
    for i in items:
        results.append({'type': 'ingredient', 'title': i.name, 'subtitle': f"SKU: {i.sku} | {float(i.quantity_on_hand)} {i.unit}", 'id': str(i.id)})
    for s in suppliers:
        results.append({'type': 'supplier', 'title': s.name, 'subtitle': f"Contact: {s.contact_name or ''}", 'id': str(s.id)})
    for po in pos:
        results.append({'type': 'po', 'title': po.po_number, 'subtitle': f"Status: {po.status} | Total: ${float(po.total_cost)}", 'id': str(po.id)})
    for r in recipes:
        results.append({'type': 'recipe', 'title': f"Recipe: {r.menu_item.name}", 'subtitle': f"Cost per portion: ${float(r.cost_per_portion)}", 'id': str(r.id)})

    return Response({'data': results})


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


@api_view(['POST'])
def ai_query_view(request):
    user = get_user_from_request(request)
    if not user:
        return Response({'error': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)

    restaurant = getattr(request, 'restaurant', None)
    if not restaurant:
        return Response({'error': 'Restaurant context is required.'}, status=status.HTTP_400_BAD_REQUEST)

    query_str = request.data.get('query', '')
    from api.services import AINaturalLanguageService
    answer = AINaturalLanguageService.answer_query(restaurant, query_str)
    return Response({'answer': answer})


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
        restaurants = Restaurant.unfiltered.all().order_by('name')

        # Build multi-location instances from our Location model too
        rest = getattr(request, 'restaurant', None)
        sub_locations = []
        if rest:
            sub_locations = Location.objects.filter(restaurant=rest)

        data = []
        for r in restaurants:
            data.append({
                'id': str(r.id),
                'name': r.name,
                'slug': r.slug,
                'type': 'restaurant',
                'subscription_tier': r.subscription_tier,
                'settings': r.settings,
                'created_at': r.created_at.isoformat()
            })

        for sl in sub_locations:
            data.append({
                'id': str(sl.id),
                'name': sl.name,
                'slug': sl.name.lower().replace(' ', '-'),
                'type': sl.type,
                'subscription_tier': 'enterprise',
                'settings': {},
                'created_at': sl.created_at.isoformat()
            })

        return Response({'data': data})

    elif request.method == 'POST':
        user = get_user_from_request(request)
        restaurant = getattr(request, 'restaurant', None)

        name = request.data.get('name')
        l_type = request.data.get('type', 'warehouse')
        address = request.data.get('address')

        if not name:
            return Response({'error': 'Name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Create sub-location scoped to current tenant
        if restaurant:
            loc = Location.objects.create(
                restaurant=restaurant,
                name=name,
                type=l_type,
                address=address
            )
            return Response({
                'id': str(loc.id),
                'name': loc.name,
                'type': loc.type,
                'address': loc.address
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': 'Tenant context required.'}, status=status.HTTP_400_BAD_REQUEST)


# ─── HEALTH CHECK ENDPOINT ───────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'ok',
        'timestamp': timezone.now().isoformat(),
        'backend': 'django'
    })

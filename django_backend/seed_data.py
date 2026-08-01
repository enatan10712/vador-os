import os
import django
import random
from decimal import Decimal
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vador_backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import (
    Restaurant, RestaurantStaff, CustomerProfile, MenuItem,
    InventoryItem, Order, OrderItem, InventoryTransaction, AuditLog
)

def seed():
    print("Seeding database with enhanced multi-tenant datasets...")

    # 1. Create Restaurants
    restaurants_data = [
        ('robusta-coffee', 'Robusta Coffee', 'trial', {'currency': 'ETB', 'theme': 'dark'}),
        ('sidama-roasters', 'Sidama Roasters', 'premium', {'currency': 'USD', 'theme': 'light'})
    ]

    restaurants = {}
    for slug, name, tier, settings in restaurants_data:
        restaurant, created = Restaurant.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'subscription_tier': tier,
                'settings': settings
            }
        )
        restaurants[slug] = restaurant
        if created:
            print(f"Created restaurant '{slug}'")
        else:
            print(f"Restaurant '{slug}' already exists")

    # 2. Create Users & Staff Roles for both Restaurants
    staff_emails = [
        ('admin@vador.com', 'admin'),
        ('manager@vador.com', 'manager'),
        ('cashier@vador.com', 'cashier'),
        ('waiter@vador.com', 'waiter'),
        ('kitchen@vador.com', 'kitchen'),
    ]

    for slug, restaurant in restaurants.items():
        for email, role in staff_emails:
            # Suffix for the second restaurant to prevent collision
            final_email = email if slug == 'robusta-coffee' else f"{slug}-{email}"
            user, created = User.objects.get_or_create(
                username=final_email,
                defaults={
                    'email': final_email,
                    'is_staff': True
                }
            )
            if created:
                user.set_password('VadorOS123!')
                user.save()
                print(f"Created user {final_email}")

            staff, created = RestaurantStaff.objects.get_or_create(
                restaurant=restaurant,
                user=user,
                defaults={'role': role, 'is_active': True}
            )
            if created:
                print(f"Linked user {final_email} as {role} for {restaurant.name}")

    # Create Global Customer
    customer_email = 'customer@vador.com'
    customer_user, created = User.objects.get_or_create(
        username=customer_email,
        defaults={
            'email': customer_email,
            'is_staff': False
        }
    )
    if created:
        customer_user.set_password('VadorOS123!')
        customer_user.save()
        print("Created customer user")

    CustomerProfile.objects.get_or_create(
        user=customer_user,
        defaults={
            'full_name': 'Abebe Bikila',
            'phone': '+251911223344'
        }
    )

    # 3. Seed Menu Items
    menu_items_data = [
        ('Sidama Single-Origin Espresso', 110.00, 'Beverages'),
        ('Yirgacheffe Pour-Over (Ceremony style)', 150.00, 'Beverages'),
        ('Spiced Teff Cruffin', 130.00, 'Bakery'),
        ('Harar Dark Roast Flat White', 120.00, 'Beverages'),
        ('Avocado Teff Sourdough Tartine', 210.00, 'Food'),
        ('Shakisso Honey Macchiato', 125.00, 'Beverages'),
        ('Traditional Gesha Nitro Cold Brew', 160.00, 'Bakery')
    ]

    menu_items = {}
    for slug, restaurant in restaurants.items():
        menu_items[slug] = []
        for name, price, category in menu_items_data:
            # Scale prices slightly differently for USD on Sidama Roasters
            final_price = price if slug == 'robusta-coffee' else round(price / 50.0, 2)
            item, created = MenuItem.objects.get_or_create(
                restaurant=restaurant,
                name=name,
                defaults={
                    'price': Decimal(str(final_price)),
                    'category': category,
                    'is_available': True
                }
            )
            menu_items[slug].append(item)
            if created:
                print(f"Created MenuItem {name} for {restaurant.name}")

    # 4. Seed Inventory Items
    inventory_items_data = [
        ('Single Origin Ethiopia Yirgacheffe Beans', 'kg', 12.5, 10.0),
        ('Oat Milk (Barista Edition)', 'Liters', 45.0, 50.0),
        ('Organic Honey & Spiced Sauces', 'kg', 6.2, 5.0),
        ('Vador Recyclable Hot Cups (12oz)', 'Units', 1450.0, 2000.0),
        ('Sidama Single-Origin Espresso', 'kg', 120.0, 10.0),
        ('Spiced Teff Cruffin', 'Units', 22.0, 20.0),
        ('Harar Dark Roast Flat White', 'kg', 240.0, 10.0),
        ('Avocado Teff Sourdough Tartine', 'Units', 18.0, 15.0),
        ('Shakisso Honey Macchiato', 'kg', 350.0, 10.0),
        ('Traditional Gesha Nitro Cold Brew', 'Liters', 60.0, 50.0)
    ]

    for slug, restaurant in restaurants.items():
        for name, unit, qty, thresh in inventory_items_data:
            InventoryItem.objects.get_or_create(
                restaurant=restaurant,
                name=name,
                defaults={
                    'unit': unit,
                    'quantity_on_hand': Decimal(str(qty)),
                    'reorder_threshold': Decimal(str(thresh))
                }
            )

    # 5. Populate Realistic Month-Long Order & Transaction History (Dynamic Analytics Seeding)
    now = timezone.now()
    admin_user = User.objects.get(username='admin@vador.com')

    print("Generating rich, month-long order history & ledger logs...")
    for slug, restaurant in restaurants.items():
        # Clean existing orders/transactions to prevent duplication during re-seed
        Order.objects.filter(restaurant=restaurant).delete()
        InventoryTransaction.objects.filter(restaurant=restaurant).delete()

        # Let's seed 60 orders over the past 30 days
        for day_offset in range(30):
            order_date = now - timezone.timedelta(days=day_offset)

            # 2 orders per day
            for _ in range(2):
                table_num = f"Table {random.randint(1, 15)}"
                items_to_order = random.sample(menu_items[slug], k=random.randint(1, 3))

                # Determine total with float to avoid operand errors
                total_float = 0.0
                for m_item in items_to_order:
                    total_float += float(m_item.price) * random.randint(1, 2)

                order = Order.objects.create(
                    restaurant=restaurant,
                    customer=customer_user if random.choice([True, False]) else None,
                    table_number=table_num,
                    total=Decimal(str(round(total_float, 2))),
                    status='completed' if day_offset > 0 or random.choice([True, False]) else 'pending'
                )
                # Override auto_now_add for historical sorting accuracy
                Order.objects.filter(id=order.id).update(created_at=order_date)

                # Create Order Items and adjust inventory atomically
                for m_item in items_to_order:
                    qty = random.randint(1, 2)
                    OrderItem.objects.create(
                        restaurant=restaurant,
                        order=order,
                        menu_item=m_item,
                        quantity=qty,
                        unit_price=m_item.price,
                        kitchen_status='ready'
                    )

                    # Create matching deduction transaction
                    try:
                        inv_item = InventoryItem.objects.get(name=m_item.name, restaurant=restaurant)
                        new_qty = max(0.0, float(inv_item.quantity_on_hand) - qty)
                        inv_item.quantity_on_hand = Decimal(str(new_qty))
                        inv_item.save()

                        tx = InventoryTransaction.objects.create(
                            restaurant=restaurant,
                            inventory_item=inv_item,
                            delta=Decimal(str(-qty)),
                            reason='sale_deduction',
                            created_by=admin_user
                        )
                        InventoryTransaction.objects.filter(id=tx.id).update(created_at=order_date)
                    except InventoryItem.DoesNotExist:
                        pass

                # Add some occasional waste and purchase records
                if random.random() < 0.15:
                    try:
                        inv_item = InventoryItem.objects.order_by('?').filter(restaurant=restaurant).first()
                        if inv_item:
                            waste_qty = random.randint(1, 5)
                            new_qty = max(0.0, float(inv_item.quantity_on_hand) - waste_qty)
                            inv_item.quantity_on_hand = Decimal(str(new_qty))
                            inv_item.save()

                            tx_w = InventoryTransaction.objects.create(
                                restaurant=restaurant,
                                inventory_item=inv_item,
                                delta=Decimal(str(-waste_qty)),
                                reason='waste',
                                created_by=admin_user
                            )
                            InventoryTransaction.objects.filter(id=tx_w.id).update(created_at=order_date)
                    except Exception:
                        pass

                if random.random() < 0.10:
                    try:
                        inv_item = InventoryItem.objects.order_by('?').filter(restaurant=restaurant).first()
                        if inv_item:
                            p_qty = random.randint(20, 100)
                            inv_item.quantity_on_hand = F('quantity_on_hand') + p_qty
                            inv_item.save()

                            tx_p = InventoryTransaction.objects.create(
                                restaurant=restaurant,
                                inventory_item=inv_item,
                                delta=Decimal(str(p_qty)),
                                reason='purchase',
                                created_by=admin_user
                            )
                            InventoryTransaction.objects.filter(id=tx_p.id).update(created_at=order_date)
                    except Exception:
                        pass

                # Audit Log
                AuditLog.objects.create(
                    restaurant=restaurant,
                    actor=admin_user,
                    action='create_order',
                    entity_type='order',
                    entity_id=order.id,
                    before=None,
                    after={'order_id': str(order.id), 'total': float(total_float)}
                )

    print("Enhanced seeding completed successfully!")

if __name__ == '__main__':
    seed()

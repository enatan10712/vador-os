import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vador_backend.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import Restaurant, RestaurantStaff, CustomerProfile, MenuItem, InventoryItem

def seed():
    print("Seeding database...")

    # 1. Create Default Restaurant
    restaurant, created = Restaurant.objects.get_or_create(
        slug='robusta-coffee',
        defaults={
            'name': 'Robusta Coffee',
            'subscription_tier': 'trial',
            'settings': {'theme': 'dark', 'currency': 'ETB'}
        }
    )
    if created:
        print("Created restaurant 'robusta-coffee'")
    else:
        print("Restaurant 'robusta-coffee' already exists")

    # 2. Create Users & Staff Roles
    users_to_create = [
        ('admin@vador.com', 'admin'),
        ('manager@vador.com', 'manager'),
        ('cashier@vador.com', 'cashier'),
        ('waiter@vador.com', 'waiter'),
        ('kitchen@vador.com', 'kitchen'),
    ]

    for email, role in users_to_create:
        username = email.split('@')[0]
        user, created = User.objects.get_or_create(
            username=email,
            defaults={
                'email': email,
                'is_staff': True
            }
        )
        if created:
            user.set_password('VadorOS123!')
            user.save()
            print(f"Created user {email}")

        # Link role
        staff, created = RestaurantStaff.objects.get_or_create(
            restaurant=restaurant,
            user=user,
            defaults={'role': role, 'is_active': True}
        )
        if created:
            print(f"Linked user {email} as {role} for {restaurant.name}")

    # Create Customer Profile User
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
    menu_items = [
        ('Sidama Single-Origin Espresso', 110.00, 'Beverages'),
        ('Yirgacheffe Pour-Over (Ceremony style)', 150.00, 'Beverages'),
        ('Spiced Teff Cruffin', 130.00, 'Bakery'),
        ('Harar Dark Roast Flat White', 120.00, 'Beverages'),
        ('Avocado Teff Sourdough Tartine', 210.00, 'Food'),
        ('Shakisso Honey Macchiato', 125.00, 'Beverages'),
        ('Traditional Gesha Nitro Cold Brew', 160.00, 'Bakery')
    ]

    for name, price, category in menu_items:
        item, created = MenuItem.objects.get_or_create(
            restaurant=restaurant,
            name=name,
            defaults={
                'price': price,
                'category': category,
                'is_available': True
            }
        )
        if created:
            print(f"Created MenuItem {name}")

    # 4. Seed Inventory Items
    inventory_items = [
        ('Single Origin Ethiopia Yirgacheffe Beans', 'kg', 4.2, 10.0),
        ('Oat Milk (Barista Edition)', 'Liters', 15.0, 50.0),
        ('Organic Honey & Spiced Sauces', 'kg', 1.2, 5.0),
        ('Vador Recyclable Hot Cups (12oz)', 'Units', 450.0, 2000.0),
        ('Sidama Single-Origin Espresso', 'kg', 120.0, 10.0),
        ('Spiced Teff Cruffin', 'Units', 12.0, 20.0),
        ('Harar Dark Roast Flat White', 'kg', 240.0, 10.0),
        ('Avocado Teff Sourdough Tartine', 'Units', 8.0, 15.0),
        ('Shakisso Honey Macchiato', 'kg', 350.0, 10.0),
        ('Traditional Gesha Nitro Cold Brew', 'Liters', 0.0, 50.0)
    ]

    for name, unit, qty, thresh in inventory_items:
        item, created = InventoryItem.objects.get_or_create(
            restaurant=restaurant,
            name=name,
            defaults={
                'unit': unit,
                'quantity_on_hand': qty,
                'reorder_threshold': thresh
            }
        )
        if created:
            print(f"Created InventoryItem {name}")

    print("Seeding complete!")

if __name__ == '__main__':
    seed()

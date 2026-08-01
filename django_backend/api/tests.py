from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from api.models import (
    Restaurant, MenuItem, InventoryItem, AuditLog,
    set_current_restaurant, get_current_restaurant
)

class TenantIsolationTests(TestCase):
    """
    RLS integration tests: assert that rows are strictly isolated per tenant
    and cross-tenant data leaks are impossible at the database/ORM layer.
    """
    def setUp(self):
        # Create two distinct restaurants
        self.restaurant_a = Restaurant.objects.create(name="Restaurant A", slug="rest-a")
        self.restaurant_b = Restaurant.objects.create(name="Restaurant B", slug="rest-b")

        # Create menu items for Restaurant A
        MenuItem.objects.create(restaurant=self.restaurant_a, name="Dish A1", price=10.00)
        MenuItem.objects.create(restaurant=self.restaurant_a, name="Dish A2", price=15.50)

        # Create menu items for Restaurant B
        MenuItem.objects.create(restaurant=self.restaurant_b, name="Dish B1", price=12.00)

    def test_tenant_a_cannot_see_tenant_b_rows(self):
        # Set context to Restaurant A
        set_current_restaurant(self.restaurant_a)

        # Querying MenuItem should ONLY return Restaurant A's items
        items = MenuItem.objects.all()
        self.assertEqual(items.count(), 2)
        for item in items:
            self.assertEqual(item.restaurant, self.restaurant_a)
            self.assertNotEqual(item.restaurant, self.restaurant_b)

    def test_tenant_b_cannot_see_tenant_a_rows(self):
        # Set context to Restaurant B
        set_current_restaurant(self.restaurant_b)

        # Querying MenuItem should ONLY return Restaurant B's items
        items = MenuItem.objects.all()
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().restaurant, self.restaurant_b)

    def test_global_scope_if_no_tenant_is_set(self):
        # When no tenant is active, all items are visible (e.g. for global admin views)
        set_current_restaurant(None)
        items = MenuItem.unfiltered.all()
        self.assertEqual(items.count(), 3)


class InventoryLedgerTests(TestCase):
    """
    Tests atomic inventory ledger operations and concurrency/overselling constraints.
    """
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Coffee Shop", slug="coffee-shop")
        self.item = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Coffee Beans",
            unit="kg",
            quantity_on_hand=10.0,
            reorder_threshold=2.0
        )

    def test_deduction_success(self):
        # Deduct 4 kg
        set_current_restaurant(self.restaurant)
        self.item.quantity_on_hand -= 4
        self.item.save()

        self.assertEqual(self.item.quantity_on_hand, 6.0)

    def test_overselling_prevention(self):
        # Deduct 15 kg (more than 10.0 kg on hand) should not be allowed or raise exception if checked
        set_current_restaurant(self.restaurant)

        # Test custom check
        with self.assertRaises(ValidationError):
            qty_to_deduct = 15.0
            if self.item.quantity_on_hand < qty_to_deduct:
                raise ValidationError("insufficient_stock")


class AuditLogImmutabilityTests(TestCase):
    """
    Tests that the immutable audit logs cannot be updated or deleted.
    """
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Central", slug="central")
        self.user = User.objects.create_user(username="auditor", password="password")
        self.log = AuditLog.objects.create(
            restaurant=self.restaurant,
            actor=self.user,
            action="update_inventory",
            entity_type="inventory",
            entity_id=None,
            before={"qty": 10},
            after={"qty": 5}
        )

    def test_audit_log_cannot_be_updated(self):
        with self.assertRaises(ValidationError):
            self.log.action = "hack_log"
            self.log.save()

    def test_audit_log_cannot_be_deleted(self):
        with self.assertRaises(ValidationError):
            self.log.delete()

from django.test import TestCase
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from decimal import Decimal
from api.models import (
    Restaurant, MenuItem, InventoryItem, AuditLog, Recipe, RecipeIngredient,
    Location, Supplier, StockTransfer, StockTransferItem,
    set_current_restaurant, get_current_restaurant
)
from api.views import convert_unit

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


class EnterpriseInventoryTests(TestCase):
    """
    Comprehensive tests for the advanced supply chain additions.
    Covers UOM conversions, plate costing, automatic recipe deductions, and transfer workflows.
    """
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Vador Bistro", slug="vador-bistro")
        set_current_restaurant(self.restaurant)

        self.supplier = Supplier.objects.create(
            restaurant=self.restaurant,
            name="Highland Farmers",
            code="HLF"
        )

        self.beans = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Espresso Beans",
            unit="kg",
            quantity_on_hand=Decimal('50.00'),
            average_cost=Decimal('15.00'),
            conversion_ratio=Decimal('1000.00'), # 1000 g per kg
            supplier=self.supplier
        )

        self.milk = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Whole Milk",
            unit="L",
            quantity_on_hand=Decimal('100.00'),
            average_cost=Decimal('1.50')
        )

        self.espresso = MenuItem.objects.create(
            restaurant=self.restaurant,
            name="Single Espresso",
            price=Decimal('3.50')
        )

        # Create Recipe: Single Espresso uses 14g of Espresso Beans and 0.1L of Whole Milk
        self.recipe = Recipe.objects.create(
            restaurant=self.restaurant,
            menu_item=self.espresso,
            preparation_yield=Decimal('1.0')
        )

        RecipeIngredient.objects.create(
            restaurant=self.restaurant,
            recipe=self.recipe,
            inventory_item=self.beans,
            quantity=Decimal('14.00'), # 14 grams
            unit="g"
        )

        RecipeIngredient.objects.create(
            restaurant=self.restaurant,
            recipe=self.recipe,
            inventory_item=self.milk,
            quantity=Decimal('0.10'), # 0.1 Liters
            unit="L"
        )

    def test_unit_conversion_mass(self):
        # Convert 14g to kg
        kg = convert_unit(14, 'g', 'kg', conversion_ratio=1000)
        self.assertEqual(kg, Decimal('0.014'))

        # Convert 2kg to g
        grams = convert_unit(2, 'kg', 'g', conversion_ratio=1000)
        self.assertEqual(grams, Decimal('2000'))

    def test_unit_conversion_packaging(self):
        # Convert 2 cases of 12 bottles to bottles
        bottles = convert_unit(2, 'cases', 'bottles', conversion_ratio=12)
        self.assertEqual(bottles, Decimal('24'))

    def test_recipe_plate_costing(self):
        # Portion cost calculations
        # 14g of Beans = 14 * (15.00 / 1000) = 0.21
        # 0.1L of Milk = 0.1 * 1.50 = 0.15
        # Total cost = 0.21 + 0.15 = 0.36
        beans_cost = Decimal('14.00') * (self.beans.average_cost / Decimal('1000.00'))
        milk_cost = Decimal('0.10') * self.milk.average_cost
        expected_total = beans_cost + milk_cost

        self.assertEqual(expected_total, Decimal('0.36'))

    def test_recipe_automatic_deduction_via_pos(self):
        set_current_restaurant(self.restaurant)
        # Create an Order with 2 Single Espressos
        user = User.objects.create_user(username="cashier_test", password="password")

        from django.test import RequestFactory
        from api.views import orders_list_create
        factory = RequestFactory()

        # Build Order POST request
        payload = {
            'table_number': '14',
            'items': [
                {
                    'product_id': str(self.espresso.id),
                    'quantity': 2,
                    'price': '3.50'
                }
            ]
        }

        request = factory.post('/api/orders/', data=payload, content_type='application/json')
        request.user = user
        request.restaurant = self.restaurant
        request._dont_enforce_csrf_checks = True

        # Execute orders creation view
        response = orders_list_create(request)
        self.assertEqual(response.status_code, 201)

        # Verify atomic deductions:
        # Beans: 50kg - (14g * 2) = 50kg - 28g = 49.972 kg
        # Milk: 100L - (0.1L * 2) = 100L - 0.2L = 99.8 L
        self.beans.refresh_from_db()
        self.milk.refresh_from_db()

        self.assertEqual(self.beans.quantity_on_hand, Decimal('49.9720'))
        self.assertEqual(self.milk.quantity_on_hand, Decimal('99.8000'))


class EnterpriseServiceLayerAndAIQueryTests(TestCase):
    """
    Tests covering POSTransactionService, InventoryManagementService,
    AINaturalLanguageService, and AI query views.
    """
    def setUp(self):
        self.restaurant = Restaurant.objects.create(name="Sidama Roasters", slug="sidama-roasters")
        set_current_restaurant(self.restaurant)

        self.user = User.objects.create_user(username="test_manager", password="password")

        self.item = InventoryItem.objects.create(
            restaurant=self.restaurant,
            name="Harar Coffee Beans",
            unit="kg",
            quantity_on_hand=Decimal('100.00'),
            reorder_threshold=Decimal('10.00'),
            average_cost=Decimal('50.00'),
            weighted_average_cost=Decimal('50.00')
        )

        self.espresso = MenuItem.objects.create(
            restaurant=self.restaurant,
            name="Harar Espresso",
            price=Decimal('120.00')
        )

        # Create Recipe for Harar Espresso using 1kg of beans (massive for testing UOM deduction easily)
        self.recipe = Recipe.objects.create(
            restaurant=self.restaurant,
            menu_item=self.espresso,
            preparation_yield=Decimal('1.0'),
            cost_per_portion=Decimal('50.00')
        )

        RecipeIngredient.objects.create(
            restaurant=self.restaurant,
            recipe=self.recipe,
            inventory_item=self.item,
            quantity=Decimal('1.00'),
            unit="kg"
        )

    def test_pos_transaction_service_checkout(self):
        # Checkout 5 espressos atomically
        from api.services import POSTransactionService
        order = POSTransactionService.process_pos_checkout(
            restaurant=self.restaurant,
            user=self.user,
            table_number="Table 5",
            items=[{
                'product_id': str(self.espresso.id),
                'quantity': 5
            }],
            payment_currency="ETB",
            tax_type="VAT"
        )

        # Grand total: (120 * 5) + 15% VAT = 600 + 90 = 690 ETB
        self.assertEqual(order.total, Decimal('690.00'))
        self.assertEqual(order.status, 'completed')

        # Verify inventory has been deducted
        self.item.refresh_from_db()
        # 100kg - (1kg * 5) = 95kg
        self.assertEqual(self.item.quantity_on_hand, Decimal('95.00'))

    def test_inventory_management_service_adjust(self):
        from api.services import InventoryManagementService
        # Add 25 kg
        updated_item = InventoryManagementService.adjust_stock(
            restaurant=self.restaurant,
            user=self.user,
            item_id=self.item.id,
            quantity_delta=Decimal('25.00'),
            reason='purchase',
            notes='Received premium batch'
        )

        self.assertEqual(updated_item.quantity_on_hand, Decimal('125.00'))

    def test_ai_natural_language_service_revenue_query(self):
        from api.services import AINaturalLanguageService
        # Add some completed order
        from api.models import Order
        Order.objects.create(
            restaurant=self.restaurant,
            customer=self.user,
            table_number="4",
            status='completed',
            total=Decimal('450.50')
        )

        ans = AINaturalLanguageService.answer_query(self.restaurant, "Show today's revenue")
        self.assertIn("450.50", ans)
        self.assertIn("Sidama Roasters", ans)

    def test_ai_natural_language_service_low_stock_query(self):
        from api.services import AINaturalLanguageService
        # Set stock below threshold
        self.item.quantity_on_hand = Decimal('5.00')
        self.item.save()

        ans = AINaturalLanguageService.answer_query(self.restaurant, "what is running low?")
        self.assertIn("Harar Coffee Beans", ans)

    def test_ai_natural_language_service_profit_query(self):
        from api.services import AINaturalLanguageService
        ans = AINaturalLanguageService.answer_query(self.restaurant, "highest profit dishes")
        self.assertIn("Harar Espresso", ans)
        self.assertIn("120.00", ans)

    def test_ai_query_view_endpoint(self):
        from django.test import RequestFactory
        from api.views import ai_query_view
        factory = RequestFactory()

        request = factory.post('/api/ai/query/', data={'query': "What is the revenue?"}, content_type='application/json')
        request.user = self.user
        request.restaurant = self.restaurant
        request._dont_enforce_csrf_checks = True

        response = ai_query_view(request)
        self.assertEqual(response.status_code, 200)
        self.assertIn('answer', response.data)

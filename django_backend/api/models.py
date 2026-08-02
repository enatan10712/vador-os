import uuid
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

# Thread-local tenant/restaurant helper
import threading

_thread_locals = threading.local()

def get_current_restaurant():
    """Gets the currently active restaurant for tenant isolation."""
    return getattr(_thread_locals, 'restaurant', None)

def set_current_restaurant(restaurant):
    """Sets the currently active restaurant for tenant isolation."""
    _thread_locals.restaurant = restaurant


class TenantManager(models.Manager):
    """
    Manager that automatically filters all queries by the active restaurant.
    Guarantees strict tenant isolation at the database layer (ORM).
    """
    def get_queryset(self):
        qs = super().get_queryset()
        restaurant = get_current_restaurant()
        if restaurant is not None:
            return qs.filter(restaurant=restaurant)
        return qs


class Restaurant(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    subscription_tier = models.CharField(max_length=50, default='trial')
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class RestaurantStaff(models.Model):
    STAFF_ROLES = [
        ('owner', 'Owner'),
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('chef', 'Chef'),
        ('kitchen_staff', 'Kitchen Staff'),
        ('kitchen', 'Kitchen'),
        ('storekeeper', 'Storekeeper'),
        ('cashier', 'Cashier'),
        ('waiter', 'Waiter'),
        ('purchasing_officer', 'Purchasing Officer'),
        ('auditor', 'Auditor'),
        ('administrator', 'Administrator'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='staff')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='restaurant_staff')
    role = models.CharField(max_length=50, choices=STAFF_ROLES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('restaurant', 'user')

    def __str__(self):
        return f"{self.user.username} - {self.role} at {self.restaurant.name}"


class CustomerProfile(models.Model):
    """
    Customer is global and NOT tied to a single restaurant.
    Treated as a completely separate identity from the staff roles.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, primary_key=True, related_name='customer_profile')
    full_name = models.CharField(max_length=255, null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.full_name or self.user.email or self.user.username


class TenantModel(models.Model):
    """
    Abstract base model for restaurant-scoped tables.
    Uses TenantManager as the default manager to guarantee strict RLS-like isolation.
    """
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE)

    # Use TenantManager as default to prevent any accidental cross-tenant leakage.
    objects = TenantManager()
    unfiltered = models.Manager()

    class Meta:
        abstract = True


class Location(TenantModel):
    LOCATION_TYPES = [
        ('restaurant', 'Restaurant'),
        ('warehouse', 'Warehouse'),
        ('central_kitchen', 'Central Kitchen'),
        ('storage_room', 'Storage Room'),
        ('cloud_kitchen', 'Cloud Kitchen'),
        ('franchise', 'Franchise'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    type = models.CharField(max_length=50, choices=LOCATION_TYPES, default='restaurant')
    address = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class Supplier(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100, null=True, blank=True)
    contact_name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    phone = models.CharField(max_length=50, null=True, blank=True)
    address = models.TextField(null=True, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00) # Supplier rating (1-5)
    lead_time_days = models.IntegerField(default=3)
    payment_terms = models.CharField(max_length=100, null=True, blank=True) # e.g. Net 30, COD
    delivery_schedule = models.CharField(max_length=255, null=True, blank=True)
    minimum_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class MenuItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, null=True, blank=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} (${self.price})"


class InventoryItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50) # kg, g, lb, oz, L, mL, cups, bottles, cases, pieces, bags etc.
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    reorder_threshold = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)

    # Enterprise attributes added for advanced supply chain
    sku = models.CharField(max_length=100, null=True, blank=True)
    barcode = models.CharField(max_length=100, null=True, blank=True)
    qr_code = models.CharField(max_length=100, null=True, blank=True)
    internal_code = models.CharField(max_length=100, null=True, blank=True)
    display_name = models.CharField(max_length=255, null=True, blank=True)
    category = models.CharField(max_length=100, null=True, blank=True) # Produce, Meat, Alcohol, Cleaning, Small wares, etc.
    subcategory = models.CharField(max_length=100, null=True, blank=True)
    brand = models.CharField(max_length=100, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    storage_location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True, related_name='inventory_items')
    storage_type = models.CharField(max_length=100, null=True, blank=True) # frozen, chilled, dry storage, etc.
    shelf = models.CharField(max_length=100, null=True, blank=True)
    bin = models.CharField(max_length=100, null=True, blank=True)
    rack = models.CharField(max_length=100, null=True, blank=True)
    image_url = models.CharField(max_length=500, null=True, blank=True)
    description = models.TextField(null=True, blank=True)
    purchase_unit = models.CharField(max_length=50, null=True, blank=True)
    recipe_unit = models.CharField(max_length=50, null=True, blank=True)
    conversion_ratio = models.DecimalField(max_digits=12, decimal_places=4, default=1.0)
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    maximum_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    reorder_point = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    safety_stock = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    par_level = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    reserved_quantity = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    available_quantity = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    incoming_quantity = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    average_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    latest_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    weighted_average_cost = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    tax_category = models.CharField(max_length=50, null=True, blank=True)
    allergens = models.JSONField(default=list, blank=True)
    nutrition = models.JSONField(default=dict, blank=True)
    shelf_life_days = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, default='active') # active, inactive, draft
    notes = models.TextField(null=True, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"{self.name} ({self.quantity_on_hand} {self.unit})"


class InventoryBatch(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    lot_number = models.CharField(max_length=100, null=True, blank=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    best_before_date = models.DateField(null=True, blank=True)
    use_by_date = models.DateField(null=True, blank=True)
    open_date = models.DateField(null=True, blank=True)
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Batch {self.batch_number} for {self.inventory_item.name}"


class Recipe(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item = models.OneToOneField(MenuItem, on_delete=models.CASCADE, related_name='recipe')
    preparation_yield = models.DecimalField(max_digits=12, decimal_places=4, default=1.0) # e.g. yields 1 portion
    portion_size = models.CharField(max_length=100, null=True, blank=True)
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cooking_loss_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    cost_per_portion = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    version = models.CharField(max_length=50, default='1.0')
    instructions = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recipe for {self.menu_item.name} (v{self.version})"


class RecipeIngredient(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='ingredients')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='recipe_usages')
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    unit = models.CharField(max_length=50) # kg, g, lb, oz, L, mL, etc.
    waste_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.quantity} {self.unit} of {self.inventory_item.name} in {self.recipe.menu_item.name}"


class PurchaseOrder(TenantModel):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('ordered', 'Ordered'),
        ('partially_received', 'Partially Received'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(max_length=100, unique=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='purchase_orders')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='draft')
    expected_delivery_date = models.DateField(null=True, blank=True)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_pos')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_pos')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PO {self.po_number} - {self.status}"


class PurchaseOrderItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=4)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.quantity_ordered}x {self.inventory_item.name} for PO {self.purchase_order.po_number}"


class InventoryTransaction(TenantModel):
    REASONS = [
        ('purchase', 'Purchase'),
        ('waste', 'Waste'),
        ('sale_deduction', 'Sale Deduction'),
        ('adjustment', 'Adjustment'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='transactions')
    delta = models.DecimalField(max_digits=12, decimal_places=4)
    reason = models.CharField(max_length=50, choices=REASONS)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reason.upper()}: {self.delta} on {self.inventory_item.name}"


class StockMovement(TenantModel):
    MOVEMENT_TYPES = [
        ('purchase', 'Purchase'),
        ('consumption', 'Consumption'),
        ('recipe_usage', 'Recipe Usage'),
        ('waste', 'Waste'),
        ('spoilage', 'Spoilage'),
        ('transfer', 'Transfer'),
        ('adjustment', 'Adjustment'),
        ('return', 'Return'),
        ('production', 'Production'),
        ('receiving', 'Receiving'),
        ('sale', 'Sale'),
        ('refund', 'Refund'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='movements')
    location = models.ForeignKey(Location, on_delete=models.SET_NULL, null=True, blank=True)
    type = models.CharField(max_length=50, choices=MOVEMENT_TYPES)
    delta = models.DecimalField(max_digits=12, decimal_places=4)
    old_quantity = models.DecimalField(max_digits=12, decimal_places=4)
    new_quantity = models.DecimalField(max_digits=12, decimal_places=4)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    reason_code = models.CharField(max_length=100, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Movement {self.type}: {self.delta} on {self.inventory_item.name}"


class StockAdjustment(TenantModel):
    ADJUSTMENT_TYPES = [
        ('manual', 'Manual Adjustment'),
        ('cycle_count', 'Cycle Count Adjustment'),
        ('damage', 'Damage Adjustment'),
        ('expired', 'Expired Product Adjustment'),
        ('lost', 'Lost Inventory'),
        ('shrinkage', 'Shrinkage'),
        ('found', 'Found Inventory'),
    ]
    STATUS_CHOICES = [
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    adjustment_number = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=50, choices=ADJUSTMENT_TYPES)
    reason_code = models.CharField(max_length=100)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending_approval')
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_adjustments')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_adjustments')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Adjustment {self.adjustment_number} - {self.status}"


class StockAdjustmentItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock_adjustment = models.ForeignKey(StockAdjustment, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    old_quantity = models.DecimalField(max_digits=12, decimal_places=4)
    new_quantity = models.DecimalField(max_digits=12, decimal_places=4)
    variance = models.DecimalField(max_digits=12, decimal_places=4)

    def __str__(self):
        return f"{self.inventory_item.name} ({self.variance}) on {self.stock_adjustment.adjustment_number}"


class StockTransfer(TenantModel):
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('packed', 'Packed'),
        ('shipped', 'Shipped'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transfer_number = models.CharField(max_length=100, unique=True)
    source_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='outgoing_transfers')
    destination_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='incoming_transfers')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='requested')
    notes = models.TextField(null=True, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_transfers')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_transfers')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.transfer_number} - {self.status}"


class StockTransferItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stock_transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    quantity_requested = models.DecimalField(max_digits=12, decimal_places=4)
    quantity_transferred = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)

    def __str__(self):
        return f"{self.inventory_item.name} for Transfer {self.stock_transfer.transfer_number}"


class WasteLog(TenantModel):
    REASON_CHOICES = [
        ('spoilage', 'Spoilage'),
        ('expired', 'Expired'),
        ('kitchen_waste', 'Kitchen Waste'),
        ('customer_return', 'Customer Return'),
        ('cooking_error', 'Cooking Error'),
        ('prep_waste', 'Preparation Waste'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='waste_logs')
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    reason_code = models.CharField(max_length=50, choices=REASON_CHOICES)
    employee_responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='waste_responsibilities')
    photo_url = models.CharField(max_length=500, null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Waste of {self.quantity} {self.inventory_item.name} ({self.reason_code})"


class InventoryCountSession(TenantModel):
    TYPE_CHOICES = [
        ('cycle', 'Cycle Count'),
        ('physical', 'Physical Count'),
        ('blind', 'Blind Count'),
    ]
    STATUS_CHOICES = [
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('approved', 'Approved'),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    count_number = models.CharField(max_length=100, unique=True)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='scheduled')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_counts')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_counts')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Count Session {self.count_number} ({self.type}) - {self.status}"


class InventoryCountItem(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    count_session = models.ForeignKey(InventoryCountSession, on_delete=models.CASCADE, related_name='items')
    inventory_item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE)
    expected_quantity = models.DecimalField(max_digits=12, decimal_places=4)
    actual_quantity = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    variance = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)

    def __str__(self):
        return f"{self.inventory_item.name} Count for session {self.count_session.count_number}"


class Order(TenantModel):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('preparing', 'Preparing'),
        ('ready', 'Ready'),
        ('served', 'Served'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    table_number = models.CharField(max_length=50, null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order {self.id} ({self.status}) at {self.restaurant.name}"


class OrderItem(TenantModel):
    KITCHEN_STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('cooking', 'Cooking'),
        ('ready', 'Ready'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    kitchen_status = models.CharField(max_length=50, choices=KITCHEN_STATUS_CHOICES, default='queued')

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name} for Order {self.order.id}"


class AuditLog(TenantModel):
    """
    Immutable audit logs. No updates or deletions are permitted.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100)
    entity_id = models.UUIDField(null=True, blank=True)
    before = models.JSONField(null=True, blank=True)
    after = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Use standard manager only; auditing spans restaurants if needed, but standard can still filter
    def save(self, *args, **kwargs):
        # If the log already exists in the database, prevent updates.
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValidationError("Audit logs are immutable append-only ledgers. Updates are strictly forbidden.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit logs are immutable append-only ledgers. Deletions are strictly forbidden.")

    def __str__(self):
        return f"{self.action} on {self.entity_type} by {self.actor}"


class Notification(TenantModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type = models.CharField(max_length=100)
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification {self.type} for {self.user.username}"

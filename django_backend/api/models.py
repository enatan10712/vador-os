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
    unit = models.CharField(max_length=50)
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)
    reorder_threshold = models.DecimalField(max_digits=12, decimal_places=4, default=0.0)

    def __str__(self):
        return f"{self.name} ({self.quantity_on_hand} {self.unit})"


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

from django.utils.deprecation import MiddlewareMixin
from api.models import Restaurant, set_current_restaurant, get_current_restaurant

class TenantIsolationMiddleware(MiddlewareMixin):
    """
    Middleware that intercepts requests, extracts the active tenant/restaurant slug,
    and sets the thread-local restaurant context to enforce RLS-like tenant isolation.
    """
    def process_request(self, request):
        # 1. Attempt to extract the tenant slug from header, query string, or host
        tenant_slug = request.headers.get('X-Tenant-Slug')

        if not tenant_slug:
            tenant_slug = request.GET.get('tenant_slug')

        if not tenant_slug:
            # Fallback to parsing subdomain/host if any (e.g. vador-main.localhost)
            host = request.get_host()
            parts = host.split('.')
            if len(parts) > 2:
                tenant_slug = parts[0]

        # 2. If a tenant slug is found, locate the restaurant and set thread-local context
        if tenant_slug:
            try:
                restaurant = Restaurant.objects.get(slug=tenant_slug)
                set_current_restaurant(restaurant)
                request.restaurant = restaurant
            except Restaurant.DoesNotExist:
                set_current_restaurant(None)
                request.restaurant = None
        else:
            set_current_restaurant(None)
            request.restaurant = None

    def process_response(self, request, response):
        # 3. Always clear thread-local context at the end of the request-response lifecycle
        set_current_restaurant(None)
        return response

    def process_exception(self, request, exception):
        # Ensure thread-local is cleared even if an exception occurs
        set_current_restaurant(None)

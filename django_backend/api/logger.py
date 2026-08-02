import json
from django.utils import timezone

def log_structured(action, user_id=None, restaurant_slug=None, details=None):
    """
    Outputs a highly formatted structured log to standard out/error.
    Instantly parsed by Vercel logs and other logging aggregators.
    """
    log_data = {
        'timestamp': timezone.now().isoformat(),
        'action': action,
        'user_id': str(user_id) if user_id else 'system',
        'restaurant_slug': restaurant_slug or 'none',
        'details': details or {}
    }
    print(f"[VENDOR_STRUCTURED_LOG] {json.dumps(log_data)}")

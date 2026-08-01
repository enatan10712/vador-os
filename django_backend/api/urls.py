from django.urls import path
from api import views

urlpatterns = [
    path('auth/register/', views.register_view, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/session/', views.session_view, name='session'),

    path('orders/', views.orders_list_create, name='orders'),
    path('inventory/', views.inventory_list_update, name='inventory'),
    path('notifications/', views.notifications_list, name='notifications'),
    path('audit/', views.audit_list, name='audit'),
    path('sync/', views.offline_sync_view, name='offline_sync'),
    path('analytics/', views.analytics_dashboard, name='analytics'),
    path('ai/recommendations/', views.ai_assistant_recommendations, name='ai_recommendations'),
    path('alerts/', views.real_time_alerts, name='alerts'),
    path('locations/', views.locations_list_create, name='locations'),
    path('health/', views.health_check, name='health'),
]

from django.urls import path
from api import views

urlpatterns = [
    path('auth/register/', views.register_view, name='register'),
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/session/', views.session_view, name='session'),

    path('orders/', views.orders_list_create, name='orders'),
    path('inventory/', views.inventory_list_update, name='inventory'),
    path('inventory/import/', views.inventory_import_csv, name='inventory_import'),
    path('inventory/export/', views.inventory_export_csv, name='inventory_export'),

    path('suppliers/', views.suppliers_list_create, name='suppliers'),
    path('purchase-orders/', views.purchase_orders_list_create, name='purchase_orders'),
    path('purchase-orders/<uuid:pk>/action/', views.purchase_order_action, name='purchase_order_action'),

    path('transfers/', views.stock_transfers_list_create, name='stock_transfers'),
    path('transfers/<uuid:pk>/action/', views.stock_transfer_action, name='stock_transfer_action'),

    path('recipes/', views.recipes_list_create, name='recipes'),
    path('waste/', views.waste_logs_list_create, name='waste_logs'),

    path('counts/', views.count_sessions_list_create, name='count_sessions'),
    path('counts/<uuid:pk>/action/', views.count_session_action, name='count_session_action'),

    path('barcode/scan/', views.barcode_scan_view, name='barcode_scan'),
    path('search/global/', views.global_search_view, name='global_search'),

    path('notifications/', views.notifications_list, name='notifications'),
    path('audit/', views.audit_list, name='audit'),
    path('sync/', views.offline_sync_view, name='offline_sync'),
    path('analytics/', views.analytics_dashboard, name='analytics'),
    path('ai/recommendations/', views.ai_assistant_recommendations, name='ai_recommendations'),
    path('alerts/', views.real_time_alerts, name='alerts'),
    path('locations/', views.locations_list_create, name='locations'),
    path('health/', views.health_check, name='health'),
]

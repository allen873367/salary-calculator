from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StoreViewSet, RecordViewSet, stats_view, export_csv_view, backup_export_view, backup_import_view

router = DefaultRouter()
router.register('stores', StoreViewSet, basename='store')
router.register('records', RecordViewSet, basename='record')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/', stats_view, name='stats'),
    path('export/csv/', export_csv_view, name='export_csv'),
    path('backup/export/', backup_export_view, name='backup_export'),
    path('backup/import/', backup_import_view, name='backup_import'),
]

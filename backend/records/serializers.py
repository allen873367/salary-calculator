from rest_framework import serializers
from .models import Store, WorkRecord

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ('id', 'name', 'created_at')

class RecordSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    total_pay = serializers.IntegerField(read_only=True)

    class Meta:
        model = WorkRecord
        fields = (
            'id', 'store', 'store_name', 'date', 'start_time', 'end_time',
            'hours', 'hourly_wage', 'rate_multiplier',
            'overtime_hours', 'overtime_rate', 'notes',
            'total_pay', 'created_at', 'updated_at',
        )

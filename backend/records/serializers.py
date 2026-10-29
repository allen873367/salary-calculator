from rest_framework import serializers
from .models import Store, WorkRecord

class StoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = ('id', 'name', 'created_at')

class RecordSerializer(serializers.ModelSerializer):
    store_name = serializers.CharField(source='store.name', read_only=True)
    total_pay = serializers.IntegerField(read_only=True)
    gross_pay = serializers.IntegerField(read_only=True)
    base_hours = serializers.DecimalField(read_only=True, max_digits=6, decimal_places=2)

    class Meta:
        model = WorkRecord
        fields = (
            'id', 'store', 'store_name', 'date', 'start_time', 'end_time',
            'hours', 'hourly_wage', 'rate_multiplier',
            'overtime_start', 'overtime_end', 'overtime_hours', 'overtime_rate',
            'subsidy', 'insurance', 'notes',
            'total_pay', 'gross_pay', 'base_hours', 'created_at', 'updated_at',
        )

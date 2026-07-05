import json
from decimal import Decimal
from django.db.models import Sum, Count
from django.http import HttpResponse, JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Store, WorkRecord
from .serializers import StoreSerializer, RecordSerializer
from .utils import generate_csv, generate_backup

# ── Stores ──

class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer
    queryset = Store.objects.all()

    def perform_create(self, serializer):
        serializer.save()

# ── Records ──

class RecordViewSet(viewsets.ModelViewSet):
    serializer_class = RecordSerializer

    def get_queryset(self):
        qs = WorkRecord.objects.filter(user=self.request.user).select_related('store')
        store = self.request.query_params.get('store')
        month = self.request.query_params.get('month')
        if store:
            qs = qs.filter(store_id=store)
        if month:
            qs = qs.filter(date__startswith=month)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# ── Stats ──

@api_view(['GET'])
def stats_view(request):
    records = WorkRecord.objects.filter(user=request.user)
    month = request.query_params.get('month')
    if month:
        records = records.filter(date__startswith=month)
    total_pay = sum(r.total_pay() for r in records)
    total_hours = sum(float(r.hours) for r in records)

    from collections import defaultdict
    store_map = defaultdict(int)
    month_map = defaultdict(int)
    for r in records:
        pay = r.total_pay()
        name = r.store.name if r.store else '(未指定)'
        store_map[name] += pay
        month_map[r.date.strftime('%Y-%m')] += pay

    # Calculate max consecutive work days streak
    from datetime import timedelta
    dates = sorted(set(r.date for r in records))
    max_streak = 0
    current_streak = 1 if dates else 0
    for i in range(1, len(dates)):
        if dates[i] - dates[i-1] == timedelta(days=1):
            current_streak += 1
        else:
            max_streak = max(max_streak, current_streak)
            current_streak = 1
    max_streak = max(max_streak, current_streak)

    store_ranking = [{'name': k, 'amount': v, 'pct': round(v/total_pay*100, 1) if total_pay else 0}
                     for k, v in sorted(store_map.items(), key=lambda x: x[1], reverse=True)]
    month_ranking = [{'month': k, 'amount': v, 'pct': round(v/total_pay*100, 1) if total_pay else 0}
                     for k, v in sorted(month_map.items(), key=lambda x: x[0], reverse=True)]

    return Response({
        'total_pay': total_pay,
        'total_hours': round(total_hours, 1),
        'record_count': records.count(),
        'store_count': len(store_map),
        'max_streak': max_streak,
        'store_ranking': store_ranking,
        'month_ranking': month_ranking,
    })

# ── Export CSV ──

@api_view(['GET'])
def export_csv_view(request):
    records = WorkRecord.objects.filter(user=request.user).select_related('store').order_by('date')
    csv_content = generate_csv(records)
    response = HttpResponse(csv_content, content_type='text/csv; charset=utf-8-sig')
    response['Content-Disposition'] = 'attachment; filename="salary_report.csv"'
    return response

# ── Backup ──

@api_view(['GET'])
def backup_export_view(request):
    records = WorkRecord.objects.filter(user=request.user).select_related('store').order_by('date')
    data = generate_backup(records)
    return Response({'version': 1, 'records': data})

@api_view(['POST'])
@parser_classes([JSONParser])
def backup_import_view(request):
    try:
        data = request.data
        records_data = data.get('records', [])
        if not records_data:
            return Response({'error': '無資料'}, status=400)

        WorkRecord.objects.filter(user=request.user).delete()

        for item in records_data:
            store_name = item.get('store', '')
            store = None
            if store_name:
                store, _ = Store.objects.get_or_create(name=store_name)

            WorkRecord.objects.create(
                user=request.user,
                store=store,
                date=item['date'],
                start_time=item.get('start_time') or None,
                end_time=item.get('end_time') or None,
                hours=Decimal(str(item['hours'])),
                hourly_wage=int(item.get('hourly_wage', 196)),
                rate_multiplier=Decimal(str(item.get('rate_multiplier', 1.0))),
                overtime_hours=Decimal(str(item.get('overtime_hours', 0))),
                overtime_rate=Decimal(str(item.get('overtime_rate', 1.33))),
                notes=item.get('notes', ''),
            )

        return Response({'message': f'成功匯入 {len(records_data)} 筆記錄', 'count': len(records_data)})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

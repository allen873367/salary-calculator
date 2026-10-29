import json
from decimal import Decimal
from django.db.models import Sum, Count
from django.http import HttpResponse, JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, parser_classes, action
from rest_framework.parsers import JSONParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from .models import Store, WorkRecord
from .serializers import StoreSerializer, RecordSerializer
from .utils import OPENPYXL_AVAILABLE, generate_csv, generate_xlsx, generate_backup

# ── Stores ──

class StoreViewSet(viewsets.ModelViewSet):
    serializer_class = StoreSerializer

    def get_queryset(self):
        return Store.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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

    @action(detail=False, methods=['post'])
    def batch(self, request):
        """批次新增固定班表多筆記錄"""
        data = request.data
        dates = data.get('dates', [])
        if not dates or not isinstance(dates, list):
            return Response({'error': '請提供至少一個日期'}, status=400)

        store_id = data.get('store')
        store = None
        if store_id:
            store = Store.objects.filter(user=request.user, id=store_id).first()

        start_time = data.get('start_time') or None
        end_time = data.get('end_time') or None
        try:
            hours = Decimal(str(data.get('hours', 0)))
        except Exception:
            hours = Decimal('0')
        hourly_wage = int(data.get('hourly_wage', 196))
        rate_multiplier = Decimal(str(data.get('rate_multiplier', 1.0)))
        overtime_start = data.get('overtime_start') or None
        overtime_end = data.get('overtime_end') or None
        try:
            overtime_hours = Decimal(str(data.get('overtime_hours', 0)))
        except Exception:
            overtime_hours = Decimal('0')
        overtime_rate = Decimal(str(data.get('overtime_rate', 1.33)))
        subsidy = int(data.get('subsidy', 0))
        insurance = int(data.get('insurance', 0))
        notes = data.get('notes', '')
        skip_existing = data.get('skip_existing', True)

        created_count = 0
        skipped_count = 0

        for d in sorted(set(dates)):
            if skip_existing and WorkRecord.objects.filter(user=request.user, date=d, store=store).exists():
                skipped_count += 1
                continue
            WorkRecord.objects.create(
                user=request.user,
                store=store,
                date=d,
                start_time=start_time,
                end_time=end_time,
                hours=hours,
                hourly_wage=hourly_wage,
                rate_multiplier=rate_multiplier,
                overtime_start=overtime_start,
                overtime_end=overtime_end,
                overtime_hours=overtime_hours,
                overtime_rate=overtime_rate,
                subsidy=subsidy,
                insurance=insurance,
                notes=notes,
            )
            created_count += 1

        msg = f'成功建立 {created_count} 筆記錄'
        if skipped_count:
            msg += f'（略過 {skipped_count} 筆已存在的重複記錄）'

        return Response({
            'message': msg,
            'created_count': created_count,
            'skipped_count': skipped_count,
        })

# ── Stats ──

@api_view(['GET'])
def stats_view(request):
    records = WorkRecord.objects.filter(user=request.user)
    month = request.query_params.get('month')
    if month:
        records = records.filter(date__startswith=month)
    total_pay = sum(r.total_pay() for r in records)
    gross_pay = sum(r.gross_pay for r in records)
    total_insurance = sum(r.insurance for r in records)
    total_hours = sum(float(r.hours) for r in records)
    total_ot_hours = sum(float(r.overtime_hours) for r in records)
    total_base_pay = sum(round(float(r.hours) * float(r.hourly_wage) * float(r.rate_multiplier)) for r in records)
    total_ot_pay = sum(round(float(r.overtime_hours) * float(r.hourly_wage) * float(r.overtime_rate)) for r in records)
    total_subsidy = sum(r.subsidy for r in records)

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
        'gross_pay': gross_pay,
        'total_insurance': total_insurance,
        'total_base_pay': total_base_pay,
        'total_ot_pay': total_ot_pay,
        'total_subsidy': total_subsidy,
        'total_hours': round(total_hours, 1),
        'total_ot_hours': round(total_ot_hours, 1),
        'record_count': records.count(),
        'store_count': len(store_map),
        'max_streak': max_streak,
        'store_ranking': store_ranking,
        'month_ranking': month_ranking,
    })

# ── Export CSV ──

@api_view(['GET'])
def export_csv_view(request):
    qs = WorkRecord.objects.filter(user=request.user).select_related('store').order_by('date')
    month = request.query_params.get('month')
    store = request.query_params.get('store')
    if month:
        qs = qs.filter(date__startswith=month)
    if store:
        qs = qs.filter(store_id=store)
    if OPENPYXL_AVAILABLE:
        xlsx = generate_xlsx(qs)
        response = HttpResponse(
            xlsx.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = 'attachment; filename="salary_report.xlsx"'
        return response
    # 若未裝 openpyxl，退回 CSV
    csv_content = generate_csv(qs)
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
                store, _ = Store.objects.get_or_create(user=request.user, name=store_name)

            WorkRecord.objects.create(
                user=request.user,
                store=store,
                date=item['date'],
                start_time=item.get('start_time') or None,
                end_time=item.get('end_time') or None,
                hours=Decimal(str(item['hours'])),
                hourly_wage=int(item.get('hourly_wage', 196)),
                rate_multiplier=Decimal(str(item.get('rate_multiplier', 1.0))),
                overtime_start=item.get('overtime_start') or None,
                overtime_end=item.get('overtime_end') or None,
                overtime_hours=Decimal(str(item.get('overtime_hours', 0))),
                overtime_rate=Decimal(str(item.get('overtime_rate', 1.33))),
                subsidy=int(item.get('subsidy', 0)),
                insurance=int(item.get('insurance', 0)),
                notes=item.get('notes', ''),
            )

        return Response({'message': f'成功匯入 {len(records_data)} 筆記錄', 'count': len(records_data)})
    except Exception as e:
        return Response({'error': str(e)}, status=400)

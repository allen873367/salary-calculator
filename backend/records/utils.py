import csv
import io
from django.http import HttpResponse

def generate_csv(records):
    output = io.StringIO()
    output.write('﻿')  # BOM for Excel
    writer = csv.writer(output)
    writer.writerow(['日期', '上班', '下班', '加班開始', '加班結束', '店家', '時薪', '薪資倍率', '上班時數', '加班時數', '本薪', '加班費', '津貼', '合計', '備註'])

    from collections import defaultdict
    month_totals = defaultdict(int)

    for r in records:
        pay = r.total_pay()
        base_pay = round(float(r.base_hours) * float(r.hourly_wage) * float(r.rate_multiplier))
        overtime_pay = round(float(r.overtime_hours) * float(r.hourly_wage) * float(r.overtime_rate))
        month_totals[r.date.strftime('%Y-%m')] += pay
        writer.writerow([
            r.date,
            str(r.start_time)[:5] if r.start_time else '',
            str(r.end_time)[:5] if r.end_time else '',
            str(r.overtime_start)[:5] if r.overtime_start else '',
            str(r.overtime_end)[:5] if r.overtime_end else '',
            r.store.name if r.store else '', r.hourly_wage,
            r.rate_multiplier, r.base_hours, r.overtime_hours,
            base_pay, overtime_pay, r.subsidy, pay, r.notes
        ])

    # Monthly summary rows
    writer.writerow([])
    writer.writerow(['月份', '當月總計'])
    for month_key in sorted(month_totals.keys()):
        y, m = month_key.split('-')
        writer.writerow([f'{y} 年 {int(m)} 月', month_totals[month_key]])

    return output.getvalue()

def generate_backup(records):
    data = []
    for r in records:
        data.append({
            'store': r.store.name if r.store else '',
            'date': str(r.date),
            'start_time': str(r.start_time) if r.start_time else '',
            'end_time': str(r.end_time) if r.end_time else '',
            'hours': str(r.hours),
            'hourly_wage': r.hourly_wage,
            'rate_multiplier': str(r.rate_multiplier),
            'overtime_start': str(r.overtime_start) if r.overtime_start else '',
            'overtime_end': str(r.overtime_end) if r.overtime_end else '',
            'overtime_hours': str(r.overtime_hours),
            'overtime_rate': str(r.overtime_rate),
            'subsidy': r.subsidy,
            'notes': r.notes,
        })
    return data

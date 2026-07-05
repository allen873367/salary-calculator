import csv
import io
from django.http import HttpResponse

def generate_csv(records):
    output = io.StringIO()
    output.write('﻿')  # BOM for Excel
    writer = csv.writer(output)
    writer.writerow(['日期', '店家', '時薪', '薪資倍率', '工時', '本薪',
                     '加班時數', '加班費率', '加班費', '合計', '備註'])

    for r in records:
        pay = r.total_pay()
        base_pay = round(float(r.hours) * float(r.hourly_wage) * float(r.rate_multiplier))
        overtime_pay = round(float(r.overtime_hours) * float(r.hourly_wage) * float(r.overtime_rate))
        writer.writerow([
            r.date, r.store.name if r.store else '', r.hourly_wage,
            r.rate_multiplier, r.hours, base_pay,
            r.overtime_hours, r.overtime_rate, overtime_pay,
            pay, r.notes
        ])

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
            'overtime_hours': str(r.overtime_hours),
            'overtime_rate': str(r.overtime_rate),
            'notes': r.notes,
        })
    return data

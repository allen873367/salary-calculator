from django.db import models
from django.contrib.auth.models import User

class Store(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']

class WorkRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='records')
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    hours = models.DecimalField(max_digits=5, decimal_places=1)
    hourly_wage = models.PositiveIntegerField(default=196)
    rate_multiplier = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=1, default=0)
    overtime_rate = models.DecimalField(max_digits=3, decimal_places=2, default=1.33)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def total_pay(self):
        base = float(self.hours) * float(self.hourly_wage) * float(self.rate_multiplier)
        overtime = float(self.overtime_hours) * float(self.hourly_wage) * float(self.overtime_rate)
        return round(base + overtime)

    class Meta:
        ordering = ['-date', '-created_at']

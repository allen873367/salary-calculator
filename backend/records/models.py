from django.db import models
from django.contrib.auth.models import User

class Store(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stores', null=True, blank=True)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']
        unique_together = [('user', 'name')]

class WorkRecord(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='records')
    store = models.ForeignKey(Store, on_delete=models.SET_NULL, null=True, blank=True)
    date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    hours = models.DecimalField(max_digits=6, decimal_places=2)
    hourly_wage = models.PositiveIntegerField(default=196)
    rate_multiplier = models.DecimalField(max_digits=3, decimal_places=1, default=1.0)
    overtime_start = models.TimeField(null=True, blank=True)
    overtime_end = models.TimeField(null=True, blank=True)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_rate = models.DecimalField(max_digits=3, decimal_places=2, default=1.33)
    subsidy = models.PositiveIntegerField(default=0, verbose_name='津貼')
    insurance = models.PositiveIntegerField(default=0, verbose_name='勞健保自付額')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def total_pay(self):
        # 實領薪資：本薪 + 加班費 + 津貼 - 勞健保自付額
        base = float(self.hours) * float(self.hourly_wage) * float(self.rate_multiplier)
        overtime = float(self.overtime_hours) * float(self.hourly_wage) * float(self.overtime_rate)
        return max(round(base + overtime + self.subsidy - self.insurance), 0)

    @property
    def gross_pay(self):
        """應發薪資 (未扣勞健保)"""
        base = float(self.hours) * float(self.hourly_wage) * float(self.rate_multiplier)
        overtime = float(self.overtime_hours) * float(self.hourly_wage) * float(self.overtime_rate)
        return round(base + overtime + self.subsidy)

    @property
    def base_hours(self):
        return float(self.hours)

    class Meta:
        ordering = ['-date', '-created_at']

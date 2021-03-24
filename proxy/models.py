from django.db import models

class HitCount(models.Model):
    proxy_type = models.CharField(max_length=64, blank=False, null=False)
    proxy_content = models.CharField(max_length=128, blank=False, null=False)
    hits = models.PositiveIntegerField(("Hits"), default=0)

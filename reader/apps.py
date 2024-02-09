from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class ReaderConfig(AppConfig):
    name = "reader"
    verbose_name = _("reader")

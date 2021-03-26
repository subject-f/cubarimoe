from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path, re_path

from . import views

urlpatterns = [
    path("", views.home, name="site-home"),
    path("admin_home/", views.admin_home, name="admin_home"),
    path("about/", views.about, name="site-about"),
    re_path(
        r"^proxy/(?P<path>[\s\S]+)",
        views.proxy_redirect,
        name="site-proxy-redirect",
    ),
]

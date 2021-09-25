import random as r

from django.conf import settings
from django.contrib.admin.views.decorators import staff_member_required
from django.core.cache import cache
from django.shortcuts import redirect, render
from django.utils.decorators import decorator_from_middleware
from django.views.decorators.cache import cache_control
from django.http.response import HttpResponsePermanentRedirect

from homepage.middleware import ForwardParametersMiddleware
from reader.middleware import OnlineNowMiddleware
from reader.views import series_page_data


@staff_member_required
@cache_control(public=True, max_age=30, s_maxage=30)
def admin_home(request):
    online = cache.get("online_now")
    peak_traffic = cache.get("peak_traffic")
    return render(
        request,
        "homepage/admin_home.html",
        {
            "online": len(online) if online else 0,
            "peak_traffic": peak_traffic,
            "template": "home",
            "version_query": settings.STATIC_VERSION,
        },
    )


@cache_control(public=True, max_age=300, s_maxage=300)
@decorator_from_middleware(OnlineNowMiddleware)
def home(request):
    home_screen_series = {
        "Kaguya-Wants-To-Be-Confessed-To": "",
        "We-Want-To-Talk-About-Kaguya": "",
        "Kaguya-Wants-To-Be-Confessed-To-Official-Doujin": "",
    }
    return render(
        request,
        "homepage/home.html",
        {
            "abs_url": request.build_absolute_uri(),
            "relative_url": "",
            "template": "home",
            "version_query": settings.STATIC_VERSION,
        },
    )


def handle404(request, exception):
    return render(request, "homepage/how_cute_404.html", status=404)


def proxy_redirect(request, path):
    return HttpResponsePermanentRedirect(f"/read/{path}")

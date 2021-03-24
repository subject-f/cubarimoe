from django.contrib.sitemaps import Sitemap
from django.shortcuts import reverse

from misc.models import Page


class StaticViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.7
    protocol = "https"

    def items(self):
        return ["site-home", "site-about"]

    def location(self, item):
        return reverse(item)

class PagesListViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5
    protocol = "https"

    def items(self):
        items = Page.objects.all()
        return [items[0]] if len(items) else []

    def location(self, item):
        return "/pages"


class PageViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5
    protocol = "https"

    def items(self):
        return Page.objects.all().order_by("-date")

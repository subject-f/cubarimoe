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


class SeriesViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5
    protocol = "https"


class ChapterViewSitemap(Sitemap):
    changefreq = "monthly"
    priority = 0.4
    protocol = "https"


class PagesListViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5
    protocol = "https"

    def items(self):
        return [Page.objects.all()[0]]

    def location(self, item):
        return "/pages"


class PageViewSitemap(Sitemap):
    changefreq = "daily"
    priority = 0.5
    protocol = "https"

    def items(self):
        return Page.objects.all().order_by("-date")

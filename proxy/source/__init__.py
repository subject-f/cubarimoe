import abc
import json
from typing import List

import uwuify
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.urls import path, re_path
from django.views.decorators.cache import cache_control
from django.utils.html import conditional_escape

from .data import *
from .helpers import *


class ProxySource(metaclass=abc.ABCMeta):
    # /{PROXY_BASE_PATH}/:reader_prefix/slug
    @abc.abstractmethod
    def get_reader_prefix(self) -> str:
        raise NotImplementedError

    @abc.abstractmethod
    def shortcut_instantiator(self) -> List[re_path]:
        raise NotImplementedError

    @abc.abstractmethod
    async def series_api_handler(self, meta_id: str) -> SeriesAPI:
        raise NotImplementedError

    @abc.abstractmethod
    async def chapter_api_handler(self, meta_id: str) -> ChapterAPI:
        raise NotImplementedError

    @abc.abstractmethod
    async def series_page_handler(self, meta_id: str) -> SeriesPage:
        raise NotImplementedError

    def uncache_duration(self) -> int:
        return 5

    def cache_duration(self) -> int:
        return 60

    def wrap_chapter_meta(self, meta_id):
        return f"/{settings.PROXY_BASE_PATH}/api/{self.get_reader_prefix()}/chapter/{meta_id}/"

    def process_description(self, desc):
        return conditional_escape(desc)

    def _uncached_response(self, request, request_func):
        duration = self.uncache_duration()
        return cache_control(public=True, max_age=duration, s_maxage=duration)(
            request_func
        )(request)

    def _cached_response(self, request, request_func):
        duration = self.cache_duration()
        return cache_control(public=True, max_age=duration, s_maxage=duration)(
            request_func
        )(request)

    def _api_error(self, request):
        return self._uncached_response(
            request,
            lambda request: render(
                request,
                "homepage/thonk_500.html",
                {"error": "External API error."},
                status=500,
            ),
        )

    def _processing_error(self, request, exception):
        if isinstance(exception, ProxyException):
            error_msg = exception.message
        else:
            error_msg = "Processing error. This could be a Cubari problem."

        return self._uncached_response(
            request,
            lambda request: render(
                request,
                "homepage/thonk_500.html",
                {"error": error_msg, "error_uwu": uwuify.uwu(error_msg)},
                status=500,
            ),
        )

    @staticmethod
    def wrap_image_url(url):
        return (
            f"{settings.EXTERNAL_PROXY_URL}/v1/image/{encode(url)}?source=cubari_host"
        )

    async def reader_view(self, request, meta_id, chapter, page=None):
        if page:
            try:
                data = await self.series_api_handler(meta_id)
            except Exception as e:
                return self._processing_error(request, e)
            if data:
                data = data.objectify()
                if chapter.replace("-", ".") in data["chapters"]:
                    data["version_query"] = settings.STATIC_VERSION
                    data[
                        "relative_url"
                    ] = f"{settings.PROXY_BASE_PATH}/{self.get_reader_prefix()}/{meta_id}"
                    data[
                        "api_path"
                    ] = f"/{settings.PROXY_BASE_PATH}/api/{self.get_reader_prefix()}/series/"
                    data["image_proxy_url"] = settings.EXTERNAL_PROXY_URL
                    data[
                        "reader_modifier"
                    ] = f"{settings.PROXY_BASE_PATH}/{self.get_reader_prefix()}"
                    data["chapter_number"] = chapter.replace("-", ".")
                    return self._cached_response(
                        request,
                        lambda request: render(request, "reader/reader.html", data),
                    )
            return self._api_error(request)
        else:
            return self._cached_response(
                request,
                lambda request: redirect(
                    f"reader-{self.get_reader_prefix()}-chapter-page",
                    meta_id,
                    chapter,
                    "1",
                ),
            )

    async def series_view(self, request, meta_id):
        try:
            data = await self.series_page_handler(meta_id)
        except Exception as e:
            return self._processing_error(request, e)
        if data:
            data = data.objectify()
            data["synopsis"] = self.process_description(data["synopsis"])
            data["version_query"] = settings.STATIC_VERSION
            data[
                "relative_url"
            ] = f"{settings.PROXY_BASE_PATH}/{self.get_reader_prefix()}/{meta_id}"
            data[
                "reader_modifier"
            ] = f"{settings.PROXY_BASE_PATH}/{self.get_reader_prefix()}"
            return self._cached_response(
                request, lambda request: render(request, "reader/series.html", data)
            )
        else:
            return self._api_error(request)

    async def series_api_view(self, request, meta_id):
        try:
            data = await self.series_api_handler(meta_id)
        except Exception as e:
            return self._processing_error(request, e)
        if data:
            data = data.objectify()
            return self._cached_response(
                request,
                lambda request: HttpResponse(
                    json.dumps(data), content_type="application/json"
                ),
            )
        else:
            return self._api_error(request)

    async def chapter_api_view(self, request, meta_id):
        try:
            data = await self.chapter_api_handler(meta_id)
        except Exception as e:
            return self._processing_error(request, e)
        if data:
            data = data.objectify()
            return self._cached_response(
                request,
                lambda request: HttpResponse(
                    json.dumps(data["pages"]), content_type="application/json"
                ),
            )
        else:
            return self._api_error(request)

    def register_api_routes(self):
        """Routes will be under /{settings.PROXY_BASE_PATH}/api/<route>"""
        return [
            path(
                f"{self.get_reader_prefix()}/series/<str:meta_id>/",
                self.series_api_view,
                name=f"api-{self.get_reader_prefix()}-series-data",
            ),
            path(
                f"{self.get_reader_prefix()}/chapter/<str:meta_id>/",
                self.chapter_api_view,
                name=f"api-{self.get_reader_prefix()}-chapter-data",
            ),
        ]

    def register_shortcut_routes(self):
        return self.shortcut_instantiator()

    def register_frontend_routes(self):
        return [
            path(
                f"{self.get_reader_prefix()}/<str:meta_id>/",
                self.series_view,
                name=f"reader-{self.get_reader_prefix()}-series-page",
            ),
            path(
                f"{self.get_reader_prefix()}/<str:meta_id>/<str:chapter>/",
                self.reader_view,
                name=f"reader-{self.get_reader_prefix()}-chapter",
            ),
            path(
                f"{self.get_reader_prefix()}/<str:meta_id>/<str:chapter>/<str:page>/",
                self.reader_view,
                name=f"reader-{self.get_reader_prefix()}-chapter-page",
            ),
        ]

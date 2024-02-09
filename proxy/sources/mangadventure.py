from datetime import datetime as dt
from urllib.parse import urlparse

from django.http.response import HttpResponseBadRequest
from django.shortcuts import redirect
from django.urls.conf import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper, encode, decode


class MangAdventure(ProxySource):
    headers = {"Referer": "https://cubari.moe/"}

    whitelist = {
        # "127.0.0.1",
        "arc-relight.com",
        "www.arc-relight.com",
        "assortedscans.com",
        # "mangadventure.onrender.com",
    }

    def get_reader_prefix(self) -> str:
        return "mangadventure"

    def shortcut_instantiator(self) -> list:
        def handler(_, raw_url: str):
            url = urlparse(raw_url)
            if url.hostname not in self.whitelist:
                return HttpResponseBadRequest()
            if not url.path.startswith("/reader/"):
                return HttpResponseBadRequest()
            base = f"{url.scheme}/{url.netloc}/"
            path = url.path[8:].rstrip("/").split("/")
            if len(path) > 0:
                return redirect(
                    f"reader-{self.get_reader_prefix()}-series-page",
                    encode(base + path[0]),
                )
            return HttpResponseBadRequest()

        return [
            re_path(r"^ma/(?P<raw_url>[\w\d/:.-]+)", handler),
        ]

    @api_cache(prefix="ma_series_dt", time=600)
    async def series_api_handler(self, meta_id: str):
        scheme, domain, slug = decode(meta_id).split("/", 2)
        if domain not in self.whitelist:
            return None
        base = f"{scheme}/{domain}/{slug}/"
        url = f"{scheme}://{domain}/api/v2/cubari/{slug}"
        res = await get_wrapper(url, headers=self.headers)
        if res.status != 200:
            return None
        data = await res.json()

        # simplified version of the gist mappers
        groups = {
            str(key): value
            for key, value in enumerate(
                {
                    group
                    for chapter in data["chapters"].values()
                    for group in chapter["groups"].keys()
                }
            )
        }
        chapters = {}
        for ch_id, chapter in data["chapters"].items():
            chapters[ch_id] = {
                "title": chapter["title"],
                "volume": chapter["volume"],
                "chapter": chapter["number"],
            }
            group = next(
                k
                for k in groups.keys()
                for g in chapter["groups"].keys()
                if g == groups[k]
            )
            chapters[ch_id]["groups"] = {
                group: self.wrap_chapter_meta(encode(base + ch_id))
            }
            chapters[ch_id]["release_date"] = {group: int(chapter["last_updated"])}

        return SeriesAPI(
            slug=meta_id,
            title=data["title"],
            description=data["description"],
            author=data["author"],
            artist=data["artist"],
            groups=groups,
            cover=data["cover"],
            chapters=chapters,
            series_name=data["title"],
        )

    @api_cache(prefix="ma_series_page_dt", time=600)
    async def chapter_api_handler(self, meta_id: str):
        scheme, domain, slug, id = decode(meta_id).split("/", 3)
        if domain not in self.whitelist:
            return None
        url = f"{scheme}://{domain}/api/v2/chapters/{id}/pages?track=true"
        res = await get_wrapper(url, headers=self.headers)
        if res.status != 200:
            return None
        pages = [page["image"] for page in (await res.json())["results"]]
        return ChapterAPI(series=slug, pages=pages, chapter=id)

    @api_cache(prefix="ma_series_page_dt", time=600)
    async def series_page_handler(self, meta_id: str):
        scheme, domain, slug = decode(meta_id).split("/", 2)
        if domain not in self.whitelist:
            return None
        url = f"{scheme}://{domain}/api/v2/cubari/{slug}"
        res = await get_wrapper(url, headers=self.headers)
        if res.status != 200:
            return None
        data = await res.json()

        origin = f"{scheme}://{domain}{data['original_url']}"
        # simplified version of the gist mapper
        chapters = [
            [
                chapter["number"],
                ch_id,
                chapter["title"],
                ch_id,
                list(chapter["groups"].keys())[0],
                self.parse_date(chapter["last_updated"]),
                chapter["volume"],
            ]
            for ch_id, chapter in reversed(data["chapters"].items())
        ]

        return SeriesPage(
            series=data["title"],
            alt_titles=data["alt_titles"],
            alt_titles_str=None,
            slug=meta_id,
            cover_vol_url=data["cover"],
            metadata=data["metadata"],
            synopsis=data["description"],
            author=data["author"],
            chapter_list=chapters,
            original_url=origin,
        )

    @staticmethod
    def parse_date(timestamp: str) -> list:
        date = dt.utcfromtimestamp(int(timestamp)).timetuple()
        return [date[0], date[1] - 1, *date[2:6]]

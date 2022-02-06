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
        "helveticascans.com",
        "mangadventure.herokuapp.com",
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
                    encode(base + path[0])
                )
            return HttpResponseBadRequest()

        return [
            re_path(r"^ma/(?P<raw_url>[\w\d/:.-]+)", handler),
        ]

    @api_cache(prefix="ma_series_dt", time=600)
    def series_api_handler(self, meta_id: str):
        scheme, domain, slug = decode(meta_id).split("/", 2)
        if domain not in self.whitelist:
            return None
        base = f"{scheme}/{domain}/{slug}/"
        url = f"{scheme}://{domain}/api/v2/cubari/{slug}"
        res = get_wrapper(url, headers=self.headers)
        if res.status_code != 200:
            return None
        data = res.json()

        # simplified version of the gist mappers
        groups = {
            str(key): value for key, value in enumerate({
                group for chapter in data["chapters"].values()
                for group in chapter["groups"].keys()
            })
        }
        chapters = {}
        for num, chapter in data["chapters"].items():
            chapters[num] = {
                "title": chapter["title"],
                "volume": chapter["volume"]
            }
            group = next(
                k for k in groups.keys() for g in
                chapter["groups"].keys() if g == groups[k]
            )
            chapters[num]["groups"] = {
                group: self.wrap_chapter_meta(encode(
                    base + chapter["volume"] + "/" + num
                ))
            }
            chapters[num]["release_date"] = {
                group: int(chapter["last_updated"])
            }

        return SeriesAPI(
            slug=meta_id,
            title=data["title"],
            description=data["description"],
            author=data["author"],
            artist=data["artist"],
            groups=groups,
            cover=data["cover"],
            chapters=chapters,
            series_name=data["title"]
        )

    @api_cache(prefix="ma_series_page_dt", time=600)
    def chapter_api_handler(self, meta_id: str):
        scheme, domain, slug, vol, num = decode(meta_id).split("/", 4)
        if domain not in self.whitelist:
            return None
        qs = f"?series={slug}&volume={vol}&number={num}"
        url = f"{scheme}://{domain}/api/v2/pages{qs}&track=true"
        res = get_wrapper(url, headers=self.headers)
        if res.status_code != 200:
            return None
        pages = [page["image"] for page in res.json()["results"]]
        return ChapterAPI(series=slug, pages=pages, chapter=num)

    @api_cache(prefix="ma_series_page_dt", time=600)
    def series_page_handler(self, meta_id: str):
        scheme, domain, slug = decode(meta_id).split("/", 2)
        if domain not in self.whitelist:
            return None
        url = f"{scheme}://{domain}/api/v2/cubari/{slug}"
        res = get_wrapper(url, headers=self.headers)
        if res.status_code != 200:
            return None
        data = res.json()

        origin = f"{scheme}://{domain}{data['original_url']}"
        # simplified version of the gist mapper
        chapters = [[
            num, num,
            chapter["title"],
            num.replace(".", "-"),
            list(chapter["groups"].keys())[0],
            self.parse_date(chapter["last_updated"]),
            chapter["volume"],
        ] for num, chapter in reversed(data["chapters"].items())]

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

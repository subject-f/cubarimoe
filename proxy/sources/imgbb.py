from datetime import datetime

from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, ProxyException, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, post_wrapper


class Imgbb(ProxySource):
    def get_reader_prefix(self):
        return "imgbb"

    def shortcut_instantiator(self):
        def handler(request, album_hash):
            return redirect(
                f"reader-{self.get_reader_prefix()}-chapter-page",
                album_hash,
                "1",
                "1",
            )

        return [
            re_path(r"^(?:album)/(?P<album_hash>[\d\w]+)/$", handler),
        ]

    def imgbb_api(self, meta_id):
        """Backup handler using the API. It consumes the API key so be wary."""
        resp = post_wrapper(
            f"https://ibb.co/json",
            data={"action": "get-album-contents", "albumid": meta_id},
        )
        if resp.status_code == 200:
            json_response = resp.json()
            api_data = json_response["album"]
            date = datetime.utcfromtimestamp(int(api_data["time"]))
            title = api_data["name"] or "Untitled"
            pages_list = [obj["url"] for obj in json_response["contents"]]
            return {
                "slug": meta_id,
                "title": title,
                "description": api_data["description"] or "No description.",
                "author": "Unknown",
                "artist": "Unknown",
                "cover": pages_list[0],
                "groups": {"1": "Imgbb"},
                "chapter_dict": {
                    "1": {
                        "volume": "1",
                        "title": title,
                        "groups": {"1": pages_list},
                    }
                },
                "chapter_list": [
                    [
                        "1",
                        "1",
                        title,
                        "1",
                        "Unknown",
                        [
                            date.year,
                            date.month - 1,
                            date.day,
                            date.hour,
                            date.minute,
                            date.second,
                        ],
                        "1",
                    ],
                ],
                "pages_list": pages_list,
                "original_url": api_data["url"],
            }
        else:
            raise ProxyException("Imgbb failed to load.")

    @api_cache(prefix="imgbb_api_dt", time=300)
    def imgbb_common(self, meta_id):
        return self.imgbb_api(meta_id)

    @api_cache(prefix="imgbb_series_dt", time=300)
    def series_api_handler(self, meta_id):
        data = self.imgbb_api(meta_id)
        return (
            SeriesAPI(
                slug=data["slug"],
                title=data["title"],
                description=data["description"],
                author=data["author"],
                artist=data["artist"],
                groups=data["groups"],
                cover=data["cover"],
                chapters=data["chapter_dict"],
            )
            if data
            else None
        )

    @api_cache(prefix="imgbb_pages_dt", time=300)
    def chapter_api_handler(self, meta_id):
        data = self.imgbb_api(meta_id)
        return (
            ChapterAPI(
                pages=data["pages_list"], series=data["slug"], chapter=data["slug"]
            )
            if data
            else None
        )

    @api_cache(prefix="imgbb_series_page_dt", time=300)
    def series_page_handler(self, meta_id):
        data = self.imgbb_api(meta_id)
        return (
            SeriesPage(
                series=data["title"],
                alt_titles=[],
                alt_titles_str=None,
                slug=data["slug"],
                cover_vol_url=data["cover"],
                metadata=[],
                synopsis=data["description"],
                author=data["author"],
                chapter_list=data["chapter_list"],
                original_url=data["original_url"],
            )
            if data
            else None
        )

from datetime import datetime
from typing import List, Optional, Dict

from django.shortcuts import redirect
from django.urls import re_path

from proxy.source import ProxySource, SeriesPage, ChapterAPI, SeriesAPI, api_cache, post_wrapper


class Catbox(ProxySource):
    def get_reader_prefix(self) -> str:
        return "catbox"

    def shortcut_instantiator(self) -> List[re_path]:
        def handler(_, album_hash):
            slug = f"reader-{self.get_reader_prefix()}-chapter-page"
            return redirect(slug, album_hash, "1", "1")

        return [re_path(r"^c/(?P<album_hash>\w+)/$", handler)]

    @api_cache(prefix="catbox_api_dt", time=300)
    def catbox_common(self, meta_id: str) -> Optional[Dict]:
        resp = post_wrapper(f"https://catbox.moe/user/api.php", data={"reqtype": "getalbum", "short": meta_id})

        if resp.status_code != 200:
            return None

        json = resp.json()

        if json["status"] != 200 or not json["success"]:
            return None

        file_names = json["data"]["files"].split()
        url_prefix = "https://files.catbox.moe/"
        pages = [url_prefix + file_name for file_name in file_names]
        title = json["data"]["title"]
        date = datetime.strptime(json["data"]["datecreated"], "%Y-%m-%d")

        if pages.count(None) == len(pages):
            return None

        return {
            "slug": meta_id,
            "title": title,
            "description": json["data"]["description"],
            "author": "Unknown",
            "artist": "Unknown",
            "cover": pages[0],
            "groups": {"1": "catbox"},
            "chapter_dict": {
                "1": {
                    "volume": "1",
                    "title": title,
                    "groups": {"1": pages},
                }
            },
            "chapter_list": [
                [
                    "1",
                    "1",
                    title,
                    "1",
                    "Catbox",
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
            "pages_list": pages,
            "original_url": "https://catbox.moe/c/" + meta_id,
        }

    @api_cache(prefix="catbox_series_dt", time=300)
    def series_api_handler(self, meta_id: str) -> SeriesAPI:
        data = self.catbox_common(meta_id)
        return data and SeriesAPI(
            slug=data["slug"],
            title=data["title"],
            description=data["description"],
            author=data["author"],
            artist=data["artist"],
            groups=data["groups"],
            cover=data["cover"],
            chapters=data["chapter_dict"]
        )

    @api_cache(prefix="catbox_pages_dt", time=300)
    def chapter_api_handler(self, meta_id: str) -> ChapterAPI:
        data = self.catbox_common(meta_id)
        return data and ChapterAPI(
            pages=data["pages_list"],
            series=data["slug"],
            chapter=data["slug"]
        )

    @api_cache(prefix="catbox_series_page_dt", time=300)
    def series_page_handler(self, meta_id: str) -> SeriesPage:
        data = self.catbox_common(meta_id)
        return data and SeriesPage(
            series=data["title"],
            alt_titles=[],
            alt_titles_str=None,
            slug=data["slug"],
            cover_vol_url=data["cover"],
            metadata=[],
            synopsis=data["description"],
            author=data["author"],
            chapter_list=data["chapter_list"],
            original_url=data["original_url"]
        )

import re
from bs4 import BeautifulSoup

from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper


class Imgbox(ProxySource):
    def get_reader_prefix(self):
        return "imgbox"

    def shortcut_instantiator(self):
        def handler(request, album_hash):
            return redirect(
                f"reader-{self.get_reader_prefix()}-chapter-page",
                album_hash,
                "1",
                "1",
            )

        return [
            # We can't use /g/<hash> because nhentai uses that namespace already
            re_path(r"^imgbox/(?P<album_hash>[\d\w]+)/$", handler),
        ]

    @staticmethod
    def image_url_handler(url):
        # This is likely unstable, but I haven't come across enough galleries to know
        # if all thumbnail -> original URLs map cleanly like so
        return re.sub(r"_\w.", "_o.", url.replace("thumbs2", "images2"))

    @api_cache(prefix="imgbox_api_dt", time=300)
    def imgbox_common(self, meta_id):
        resp = get_wrapper(f"https://imgbox.com/g/{meta_id}")
        if resp.status_code == 200:
            soup = BeautifulSoup(resp.text, "html.parser")
            gallery = soup.find("div", id="gallery-view-content")
            pages_list = [
                self.image_url_handler(image["src"])
                for image in gallery.find_all("img")
            ]
            title_element = soup.find("h1")
            title = title_element.get_text() if title_element else "No title"
            return {
                "slug": meta_id,
                "title": title,
                "description": "No description.",
                "author": "Unknown",
                "artist": "Unknown",
                "cover": pages_list[0],
                "groups": {"1": "imgbox"},
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
                        "Imgbox",
                        "No date.",
                        "1",
                    ],
                ],
                "pages_list": pages_list,
                "original_url": f"https://imgbox.com/g/{meta_id}",
            }
        else:
            return None

    @api_cache(prefix="imgbox_series_dt", time=300)
    def series_api_handler(self, meta_id):
        data = self.imgbox_common(meta_id)
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

    @api_cache(prefix="imgbox_pages_dt", time=300)
    def chapter_api_handler(self, meta_id):
        data = self.imgbox_common(meta_id)
        return (
            ChapterAPI(
                pages=data["pages_list"], series=data["slug"], chapter=data["slug"]
            )
            if data
            else None
        )

    @api_cache(prefix="imgbox_series_page_dt", time=300)
    def series_page_handler(self, meta_id):
        data = self.imgbox_common(meta_id)
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

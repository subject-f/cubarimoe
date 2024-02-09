import json
import re
import ast
from datetime import datetime

from bs4 import BeautifulSoup
from django.conf import settings
from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper


class Dynasty(ProxySource):
    def get_reader_prefix(self):
        return "dynasty"

    def shortcut_instantiator(self):
        def handler(request, raw_url):
            if "/chapters/" in raw_url:
                slug_name = self.get_slug_name(self.normalize_slug(raw_url))
                canonical_chapter = self.parse_chapter(raw_url)
                return redirect(
                    f"reader-{self.get_reader_prefix()}-chapter-page",
                    slug_name,
                    canonical_chapter,
                    "1",
                )
            else:
                return redirect(
                    f"reader-{self.get_reader_prefix()}-series-page",
                    self.get_slug_name(self.normalize_slug(raw_url)),
                )

        return [re_path(r"^ds/(?P<raw_url>[\w\d\/:.-]+)", handler)]

    @staticmethod
    def normalize_slug(denormal):
        if "/chapters/" in denormal:
            copy = denormal
            denormal = denormal.split("/")
            if copy.startswith("http"):
                denormal.pop(0)
            denormal[-1] = "_".join(denormal[-1].split("_")[:-1])
            denormal = "https:/" + "/".join(denormal)
            denormal = denormal.replace("/chapters/", "/series/")
        return denormal

    @staticmethod
    def get_slug_name(normalized_url):
        return normalized_url.split("/")[-1]

    @staticmethod
    def parse_chapter(raw_url):
        int(raw_url.split("ch")[-1])
        return raw_url.split("ch")[-1].replace("_", ".")

    async def ds_scrape_common(self, meta_id):
        base_url = "https://dynasty-scans.com"
        series_url = "https://dynasty-scans.com/series/" + meta_id
        resp = await get_wrapper(series_url)
        if resp.status == 200:
            data = await resp.text()
            soup = BeautifulSoup(data, "html.parser")
            try:
                title = soup.find("h2").find("b").contents[0]
            except AttributeError:
                return None

            author = "None"
            description = soup.find("div", class_="description").find("p").contents[0]
            try:
                author = soup.find("h2").find("a").contents[0]
            except:
                pass
            try:
                cover = (
                    base_url + soup.find("div", class_="span2 cover").find("img")["src"]
                )
            except:
                cover = ""
            groups_dict = {"1": "Dynasty Scans"}

            chapter_list = []
            chapter_dict = {}
            chapter_data = soup.find("dl", class_="chapter-list").find_all("dd")
            chapters = []
            date_format = "%b %d '%y"
            output_date_format = "%d-%m-%Y"
            for ch in chapter_data:
                chapters.append(
                    [
                        ch.find("a", class_="name").contents[0],
                        base_url + ch.find("a", class_="name")["href"],
                        datetime.strptime(
                            ch.find("small").contents[0].replace("released ", ""),
                            date_format,
                        ).strftime(output_date_format),
                    ]
                )
            for chapter in chapters:
                try:
                    canonical_chapter = self.parse_chapter(chapter[1])
                    chapter_list.append(
                        [
                            "",
                            canonical_chapter,
                            chapter[0],
                            canonical_chapter.replace(".", "-"),
                            "Dynasty Scans",
                            chapter[2],
                            "",
                        ]
                    )
                    chapter_dict[canonical_chapter] = {
                        "volume": "1",
                        "title": chapter[0],
                        "groups": {
                            "1": self.wrap_chapter_meta(self.get_slug_name(chapter[1]))
                        },
                    }
                except:
                    pass
            return {
                "slug": meta_id,
                "title": title,
                "description": description,
                "series": title,
                "alt_titles_str": None,
                "cover_vol_url": cover,
                "metadata": [],
                "author": author,
                "artist": author,
                "groups": groups_dict,
                "cover": cover,
                "chapter_dict": chapter_dict,
                "chapter_list": chapter_list,
            }
        else:
            return None

    @api_cache(prefix="ds_series_dt", time=600)
    async def series_api_handler(self, meta_id):
        data = await self.ds_scrape_common(meta_id)
        if data:
            return SeriesAPI(
                slug=data["slug"],
                title=data["title"],
                description=data["description"],
                author=data["author"],
                artist=data["artist"],
                groups=data["groups"],
                cover=data["cover"],
                chapters=data["chapter_dict"],
            )
        else:
            return None

    @api_cache(prefix="ds_chapter_dt", time=3600)
    async def chapter_api_handler(self, meta_id):
        base_url = "https://dynasty-scans.com"
        chapter_url = "https://dynasty-scans.com/chapters/" + meta_id
        resp = await get_wrapper(chapter_url)
        if resp.status == 200:
            data = await resp.text()
            try:
                m = re.search(r"pages\s?=\s?.+\;", data)
                arr = str(m.group(0)).split()[2].strip(";")
                arr = ast.literal_eval(arr)
                pages = [(base_url + seg["image"]) for seg in arr]
                return ChapterAPI(pages=pages, series=meta_id, chapter="")
            except:
                return None

    @api_cache(prefix="ds_series_page_dt", time=600)
    async def series_page_handler(self, meta_id):
        data = await self.ds_scrape_common(meta_id)
        original_url = "https://dynasty-scans.com/series/" + meta_id

        if data:
            return SeriesPage(
                series=data["title"],
                alt_titles=[],
                alt_titles_str=None,
                slug=data["slug"],
                cover_vol_url=data["cover"],
                metadata=[],
                synopsis=data["description"],
                author=data["artist"],
                chapter_list=data["chapter_list"],
                original_url=original_url,
            )
        else:
            return None

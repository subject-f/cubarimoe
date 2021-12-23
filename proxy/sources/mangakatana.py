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
from ..source.helpers import api_cache, decode, encode, get_wrapper

#Should work with all image servers
class MangaKatana(ProxySource):
    def get_reader_prefix(self):
        return "mangakatana"

    def shortcut_instantiator(self):
        def handler(request, raw_url):
            if raw_url.strip("/").split('c')[-1].isdigit() or '?sv=' in raw_url:
                canonical_chapter = self.parse_chapter(raw_url)
                return redirect(
                    f"reader-{self.get_reader_prefix()}-chapter-page",
                    encode(self.normalize_slug(raw_url)),
                    canonical_chapter,
                    "1",
                )
            else:
                return redirect(
                    f"reader-{self.get_reader_prefix()}-series-page",
                    encode(self.normalize_slug(raw_url)),
                )

        return [
            re_path(r"^mk/(?P<raw_url>[\w\d\/:.-]+)", handler),
        ]

    @staticmethod
    def normalize_slug(denormal):
        if denormal.strip("/").split('c')[-1].isdigit() or '?sv=' in denormal:
            denormal = denormal.strip("/").split("/")
            denormal.pop(-1)
            denormal = "/".join(denormal)
        denormal = 'https://' + re.sub(r'https?:\/\/', '', denormal)
        return denormal #technically normal now lol

    @staticmethod
    def construct_url(raw):
        decoded = decode(raw)
        return ("" if decoded.startswith("http") else "https://") + decoded

    @staticmethod
    def parse_chapter(raw_url):
        if('?sv=' in raw_url):
            return [ch for ch in raw_url.split("/") if ch][-1].split("?sv=")[0].replace("c", "")
        else:
            return [ch for ch in raw_url.split("/") if ch][-1].replace("c", "")

    def mk_scrape_common(self, meta_id):
        decoded_url = self.construct_url(meta_id)
        resp = get_wrapper(decoded_url)
        if resp.status_code == 200:
            data = resp.text
            soup = BeautifulSoup(data, "html.parser")
            try:
                title = soup.title.text
            except AttributeError:
                return None
            try:
                author = soup.find_all("a", class_="author")[0].text
            except AttributeError:
                author = "None"
            try:
                for _ in soup.find_all("div", class_="summary")[0].children:
                    if(_.name == 'p'):
                        description = _.text
            except AttributeError:
                description = "No description."
            try:
                for _ in soup.find_all("div", class_="cover")[0].children:
                    if(_.name == 'img'):
                        cover = _['src']
            except AttributeError:
                cover = ""

            groups_dict = {"1": "MangaKatana"}

            chapter_list = []
            chapter_dict = {}
            chapters = list(
                map(
                    lambda a: [
                        a.select_one("a").text,
                        a.select_one("a")["href"],
                        "No date." #Just use fallback because why not?
                    ],
                    soup.find_all("div", class_="chapter"),
                )
            )
            chapters=filter(lambda a: self.construct_url(meta_id) in a[1], chapters)
            for chapter in chapters:
                canonical_chapter = self.parse_chapter(chapter[1])
                chapter_list.append(
                    [
                        "",
                        canonical_chapter,
                        chapter[0],
                        canonical_chapter.replace(".", "-"),
                        "MangaKatana",
                        chapter[2],
                        "",
                    ]
                )
                chapter_dict[canonical_chapter] = {
                    "volume": "1",
                    "title": chapter[0],
                    "groups": {"1": self.wrap_chapter_meta(encode(chapter[1]))},
                }

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

    @api_cache(prefix="mk_series_dt", time=600)
    def series_api_handler(self, meta_id):
        data = self.mk_scrape_common(meta_id)
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

    @api_cache(prefix="mk_chapter_dt", time=3600)
    def chapter_api_handler(self, meta_id):
        decoded_url = self.construct_url(meta_id)
        resp = get_wrapper(decoded_url)
        if resp.status_code == 200:
            data = resp.text
            r = re.compile(r'ytaw\s?=\s?.+,\]') #Stores images array in ytaw variable
            m = re.search(r, data)
            str_pages = re.split(re.compile(r'ytaw\s?=\s?'), m.group(0))[1]
            pages = ast.literal_eval(str_pages)
            return ChapterAPI(pages=pages, series=meta_id, chapter="")
        else:
            return None

    @api_cache(prefix="mk_series_page_dt", time=600)
    def series_page_handler(self, meta_id):
        data = self.mk_scrape_common(meta_id)
        original_url = decode(meta_id)
        if not original_url.startswith("http"):
            original_url = "https://" + original_url
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
import json
import re
from datetime import datetime

from django.conf import settings
from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, ProxyException, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper


class Hitomi(ProxySource):
    def get_reader_prefix(self):
        return "hitomi"

    def shortcut_instantiator(self):
        def handler(request, raw_url):
            series_id = self.extract_hitomi_id(raw_url)
            if "/reader/" in raw_url:
                return redirect(
                    f"reader-{self.get_reader_prefix()}-chapter-page",
                    series_id,
                    "1",
                    "1",
                )
            else:
                return redirect(
                    f"reader-{self.get_reader_prefix()}-series-page",
                    series_id,
                )

        return [
            re_path(r"^ht/(?P<raw_url>.+)", handler),
        ]

    @staticmethod
    async def get_partial_gg():
        resp = await get_wrapper("https://ltn.hitomi.la/gg.js")
        text = resp.text
        m_groups = [
            int(re.search(r"[0-9]+", case)[0])
            for case in re.findall(r"case\s+[0-9]+:", text)
        ]
        gg = dict()
        gg["m"] = m_groups
        gg["b"] = (
            re.search(r"b:\s*[\'\"][0-9]+/[\'\"]", text)[0]
            .split(" ")[-1]
            .replace("/", "")
            .replace("'", "")
        )
        return gg

    @staticmethod
    def extract_hitomi_id(url: str):
        hitomi_id = url.split("/")[-1].split("-")[-1].split(".")[-2]
        if not hitomi_id.isdigit():
            raise ProxyException(
                "This hitomi ID is invalid, this could be a cubari problem in some cases."
            )
        return hitomi_id

    @staticmethod
    def get_page_from_obj(gallery_id, obj: dict, gg: dict):
        hsh = obj["hash"]
        m1 = hsh[-1]
        m2 = hsh[-3:-1]
        location_id = int(m1 + m2, 16)
        ext = "webp" if obj["haswebp"] else obj["name"].split(".")[-1]
        path = "webp" if obj["haswebp"] else "images"
        base = "a" if (obj["haswebp"] and obj["hasavif"]) else "b"
        if location_id in gg["m"]:
            base = "b" + base
        else:
            base = "a" + base
        page_url = (
            f"https://{base}.hitomi.la/{path}/{gg['b']}/{location_id}/{hsh}.{ext}"
        )
        return page_url

    async def ht_api_common(self, meta_id):
        gg = await Hitomi.get_partial_gg()
        ht_series_api = f"https://ltn.hitomi.la/galleries/{meta_id}.js"
        resp = await get_wrapper(ht_series_api)
        if resp.status_code == 200:
            data = resp.text.replace("var galleryinfo = ", "")
            api_data = json.loads(data)

            title = api_data["title"]

            pages_list = [
                self.wrap_image_url(self.get_page_from_obj(meta_id, page, gg))
                for page in api_data["files"]
            ]
            chapter_dict = {
                "1": {"volume": "1", "title": title, "groups": {"1": pages_list}}
            }
            date = datetime.strptime(f"{api_data['date']}00", "%Y-%m-%d %H:%M:%S%z")
            chapter_list = [
                [
                    "1",
                    "1",
                    title,
                    "1",
                    "hitomi.la",
                    [
                        date.year,
                        date.month - 1,
                        date.day,
                        date.hour,
                        date.minute,
                        date.second,
                    ],
                    "1",
                ]
            ]

            return {
                "slug": meta_id,
                "title": api_data["title"],
                "description": " - ".join(
                    [d["tag"] for d in (api_data.get("tags", []) or [])]
                ),
                "group": "",
                "artist": "",
                "author": "",
                "groups": {"1": "hitomi.la"},
                "series": api_data["title"],
                "alt_titles_str": None,
                "cover": pages_list[0],
                "metadata": [
                    ["Type", api_data.get("type", "Unknown")],
                    ["Language", api_data.get("language", "Unknown")],
                ],
                "chapter_dict": chapter_dict,
                "chapter_list": chapter_list,
                "pages": pages_list,
            }
        else:
            return None

    @api_cache(prefix="ht_series_dt", time=600)
    async def series_api_handler(self, meta_id):
        data = await self.ht_api_common(meta_id)
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

    @api_cache(prefix="ht_chapter_dt", time=3600)
    async def chapter_api_handler(self, meta_id):
        data = await self.ht_api_common(meta_id)
        if data:
            return ChapterAPI(
                pages=data["pages"],
                series=data["slug"],
                chapter="1",
            )
        else:
            return None

    @api_cache(prefix="ht_series_page_dt", time=600)
    async def series_page_handler(self, meta_id):
        data = await self.ht_api_common(meta_id)
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
                original_url=f"https://hitomi.la/reader/{meta_id}.html#1",
            )
        else:
            return None

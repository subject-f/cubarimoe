import itertools
import re
from datetime import datetime, timezone

from django.conf import settings
from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper

SUPPORTED_LANG = "en"
API_URL = "https://api.comick.fun"


class ComicK(ProxySource):
    def get_reader_prefix(self):
        return "comick"

    def shortcut_instantiator(self):
        def handler(request, raw_url):
            m = re.match(
                r"https?://comick\.io/comic/([\w-]+)(?:/[\w]+-chapter-(\d+)-[\w-]+)?",
                raw_url,
            )
            if m is not None:
                series, chapter = m.groups()
                if chapter is not None:
                    return redirect(
                        f"reader-{self.get_reader_prefix()}-chapter-page",
                        series,
                        chapter,
                        "1",
                    )
                else:
                    return redirect(
                        f"reader-{self.get_reader_prefix()}-series-page",
                        series,
                    )

        return [re_path(r"^comick/(?P<raw_url>[\w\d\/:.-]+)", handler)]

    @staticmethod
    def date_parser(timestamp):
        timestamp = int(timestamp)
        date = datetime.fromtimestamp(timestamp, tz=timezone.utc)

        return [
            date.year,
            date.month - 1,
            date.day,
            date.hour,
            date.minute,
            date.second,
        ]

    @api_cache(prefix="comick_common_dt", time=600)
    def comick_common(self, meta_id):
        series_resp = get_wrapper(
            f"{API_URL}/comic/{meta_id}", params={"tachiyomi": "true"}
        )
        if series_resp.status_code == 200:
            series_data = series_resp.json()
            original_url = f"https://comick.io/comic/{meta_id}"
            title = series_data["comic"]["title"]
            alt_titles = [
                title["title"]
                for title in series_data["comic"]["md_titles"]
                if title["lang"] == SUPPORTED_LANG
            ]
            description = series_data["comic"]["desc"]
            author = series_data["authors"][0]["name"]
            cover = series_data["comic"]["cover_url"]
            hid = series_data["comic"]["hid"]

            group_index = 0
            groups_dict = {}
            groups_map = {}
            chapter_dict = {}
            limit = 60
            oneshots = 0

            for page in itertools.count(1):
                chapter_data = get_wrapper(
                    f"{API_URL}/comic/{hid}/chapters",
                    params={"page": page, "limit": 60, "lang": SUPPORTED_LANG},
                ).json()

                for chapter in chapter_data["chapters"]:
                    chapter_id = chapter["hid"]
                    chapter_number = chapter["chap"]
                    chapter_title = chapter["title"]
                    chapter_volume = chapter["vol"]
                    chapter_timestamp = datetime.strptime(
                        chapter["created_at"], "%Y-%m-%dT%H:%M:%S%z"
                    ).timestamp()

                    if not chapter_number:
                        chapter_number = f"0.{oneshots}"
                        oneshots += 1

                    chapter_group = (
                        ", ".join(chapter["group_name"])
                        if chapter["group_name"] is not None
                        else "Unknown"
                    )
                    if chapter_group not in groups_dict:
                        groups_dict[str(group_index)] = chapter_group
                        groups_map[chapter_group] = str(group_index)
                        group_index += 1

                    if chapter_number in chapter_dict:
                        chapter_obj = chapter_dict[chapter_number]
                        if not chapter_obj["title"]:
                            chapter_obj["title"] = chapter_title
                        if not chapter_obj["volume"]:
                            chapter_obj["volume"] = chapter_volume
                        chapter_obj["last_updated"] = max(
                            chapter_timestamp, chapter_obj["last_updated"]
                        )
                        chapter_dict[chapter_number]["groups"][
                            groups_map[chapter_group]
                        ] = self.wrap_chapter_meta(chapter_id)
                        chapter_dict[chapter_number]["release_date"][
                            groups_map[chapter_group]
                        ] = chapter_timestamp
                    else:
                        chapter_dict[chapter_number] = {
                            "volume": chapter_volume,
                            "title": chapter_title,
                            "groups": {
                                groups_map[chapter_group]: self.wrap_chapter_meta(
                                    chapter_id
                                )
                            },
                            "release_date": {
                                groups_map[chapter_group]: chapter_timestamp
                            },
                            "last_updated": chapter_timestamp,
                        }
                if chapter_data["total"] < page * limit:
                    break

                chapter_list = [
                    [
                        chapter_number,
                        chapter_number,
                        chapter["title"],
                        chapter_number.replace(".", "-"),
                        "Multiple Groups"
                        if len(chapter["groups"]) > 1
                        else groups_dict[list(chapter["groups"].keys())[0]],
                        "No date."
                        if not chapter["last_updated"]
                        else self.date_parser(chapter["last_updated"]),
                        chapter["volume"] or "Unknown",
                    ]
                    for chapter_number, chapter in sorted(
                        chapter_dict.items(),
                        key=lambda chapter_number: float(
                            ".".join(str(chapter_number[0]).split(".")[:2])
                            + "".join(str(chapter_number[0]).split(".")[2:])
                        ),  # To get around weird chapter numbering like 21.15.1..
                        reverse=True,
                    )
                ]

            return {
                "slug": meta_id,
                "title": title,
                "description": description,
                "series": title,
                "alt_titles": alt_titles,
                "metadata": [],
                "author": author,
                "artist": author,
                "groups": groups_dict,
                "cover": cover,
                "chapter_dict": chapter_dict,
                "chapter_list": chapter_list,
                "original_url": original_url,
            }

    @api_cache(prefix="comick_series_dt", time=600)
    def series_api_handler(self, meta_id):
        data = self.comick_common(meta_id)
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

    @api_cache(prefix="comick_chapter_dt", time=3600)
    def chapter_api_handler(self, meta_id):
        chapter_resp = get_wrapper(
            f"{API_URL}/chapter/{meta_id}", params={"tachiyomi": "true"}
        )
        if chapter_resp.status_code == 200:
            chapter_data = chapter_resp.json()
            chapter = chapter_data["chapter"]["chap"]
            series = chapter_data["chapter"]["md_comics"]["title"]
            pages = [page["url"] for page in chapter_data["chapter"]["images"]]

            return ChapterAPI(pages=pages, series=series, chapter=chapter)

    @api_cache(prefix="comick_series_page_dt", time=600)
    def series_page_handler(self, meta_id):
        data = self.comick_common(meta_id)

        if data:
            return SeriesPage(
                series=data["title"],
                alt_titles=data["alt_titles"],
                alt_titles_str=None,
                slug=data["slug"],
                cover_vol_url=data["cover"],
                metadata=[],
                synopsis=data["description"],
                author=data["author"],
                chapter_list=data["chapter_list"],
                original_url=data["original_url"],
            )
        else:
            return None

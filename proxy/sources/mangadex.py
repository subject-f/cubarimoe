from concurrent.futures.thread import ThreadPoolExecutor
from datetime import datetime
import html

from django.http import HttpResponse
from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper, post_wrapper

SUPPORTED_LANG = "en"
GROUP_KEY = "scanlation_group"


class MangaDex(ProxySource):
    def get_reader_prefix(self):
        return "mangadex"

    def shortcut_instantiator(self):
        def series(request, series_id):
            return redirect(f"reader-{self.get_reader_prefix()}-series-page", series_id)

        def series_chapter(request, series_id, chapter, page="1"):
            return redirect(
                f"reader-{self.get_reader_prefix()}-chapter-page",
                series_id,
                chapter,
                page,
            )

        def chapter(request, chapter_id, page="1"):
            data = self.chapter_api_handler(chapter_id)
            if data:
                data = data.objectify()
                return redirect(
                    f"reader-{self.get_reader_prefix()}-chapter-page",
                    str(data["series"]),
                    str(data["chapter"]),
                    page,
                )
            else:
                return HttpResponse(status=500)

        return [
            re_path(r"^title/(?P<series_id>[\d]{1,9})/$", series),
            re_path(r"^title/(?P<series_id>[\d]{1,9})/([\w-]+)/$", series),
            re_path(r"^manga/(?P<series_id>[\d]{1,9})/$", series),
            re_path(r"^manga/(?P<series_id>[\d]{1,9})/([\w-]+)/$", series),
            re_path(r"^chapter/(?P<chapter_id>[\d]{1,9})/$", chapter),
            re_path(
                r"^chapter/(?P<chapter_id>[\d]{1,9})/(?P<page>[\d]{1,9})/$", chapter
            ),
        ]

    def process_description(self, desc):
        # While I'm pretty sure MD escapes the descriptions for us, we'll unescape it
        # so we can re-process any special characters, then escape again using Django's own filter.
        # .... just in case.
        resescaped = super().process_description(html.unescape(desc))

        # MD supported BBCode: https://mangadex.org/thread/3
        # Of the ones supported, we'll only parse the text transforms and strip the rest
        allowed_tags = {
            "b",
            "i",
            "u",
            "s",
            "h",
            "sub",
            "sup",
            "code",
            "h1",
            "h2",
            "h3",
            "h4",
        }

        for tag in allowed_tags:
            resescaped = resescaped.replace(f"[{tag}]", f"<{tag}>").replace(
                f"[/{tag}]", f"</{tag}>"
            )

        # We'll ignore stripping the rest since context might be lost if we strip unsupported tags

        return resescaped

    def handle_oneshot_chapters(self, resp):
        """This expects a chapter API response object."""
        try:
            parse = (
                (lambda s: str(float(s)))
                if "." in resp["chapter"]
                else (lambda s: str(int(s)))
            )
            return parse(resp["chapter"]), parse(resp["chapter"])
        except ValueError:
            return "Oneshot", f"0.0{str(resp['timestamp'])}"

    @staticmethod
    def date_parser(timestamp):
        timestamp = int(timestamp)
        try:
            date = datetime.utcfromtimestamp(timestamp)
        except ValueError:
            date = datetime.utcfromtimestamp(timestamp // 1000)
        return [
            date.year,
            date.month - 1,
            date.day,
            date.hour,
            date.minute,
            date.second,
        ]

    @api_cache(prefix="md_common_dt", time=600)
    def md_api_common(self, meta_id):
        try:
            legacy_id = int(meta_id)
            resp = post_wrapper(
                f"https://api.mangadex.org/legacy/mapping",
                json={"type": "manga", "ids": [legacy_id]},
            )
            if resp.status_code != 200:
                return
            new_id = resp.json()[0]["data"]["attributes"]["newId"]
            return self.md_api_common(new_id)
        except ValueError:
            # Must be a UUID, so we continue
            pass
        with ThreadPoolExecutor(max_workers=2) as executor:
            result = executor.map(
                lambda req: {
                    "type": req["type"],
                    "res": get_wrapper(
                        req["url"],
                        headers={"Referer": "https://mangadex.org"},
                    ),
                },
                [
                    {
                        "type": "main",
                        "url": f"https://api.mangadex.org/manga/{meta_id}",
                    },
                    {
                        "type": "chapter",
                        "url": f"https://api.mangadex.org/manga/{meta_id}/feed?locales[]={SUPPORTED_LANG}&limit=500",  # TODO might not return all
                    },
                ],
            )

        main_data = None
        chapter_data = None

        for res in result:
            if res["res"].status_code != 200:
                return
            if res["type"] == "main":
                main_data = res["res"].json()
            elif res["type"] == "chapter":
                chapter_data = res["res"].json()

        groups_set = {
            relationship["id"]
            for chapter in chapter_data["results"]
            for relationship in chapter["relationships"]
            if relationship["type"] == GROUP_KEY
        }

        # We need to make yet another call to get the scanlator group names
        resolved_groups_map = {}
        groups_api_url = f"https://api.mangadex.org/group?limit=100"
        for group in groups_set:
            groups_api_url += f"&ids[]={group}"
        groups_resp = get_wrapper(groups_api_url)
        if groups_resp.status_code != 200:
            return
        for result in groups_resp.json()["results"]:
            resolved_groups_map[result["data"]["id"]] = result["data"]["attributes"][
                "name"
            ]

        groups_dict = {}
        groups_map = {}

        for key, value in enumerate(groups_set):
            groups_dict[str(key)] = resolved_groups_map[value]
            groups_map[value] = str(key)

        chapter_map = {
            chapter["data"]["id"]: chapter for chapter in chapter_data["results"]
        }

        chapter_dict = {}

        for chapter in chapter_data["results"]:
            chapter_id = chapter["data"]["id"]
            chapter_number = chapter["data"]["attributes"]["chapter"]
            chapter_title = chapter["data"]["attributes"]["title"]
            chapter_volume = chapter["data"]["attributes"]["volume"]
            chapter_timestamp = datetime.strptime(
                chapter["data"]["attributes"]["createdAt"], "%Y-%m-%dT%H:%M:%S%z"
            ).timestamp()
            chapter_group = None

            for relationship in chapter["relationships"]:
                if relationship["type"] == GROUP_KEY:
                    chapter_group = relationship["id"]
                    break

            if chapter_number in chapter_dict:
                chapter_obj = chapter_dict[chapter_number]
                if not chapter_obj["title"]:
                    chapter_obj["title"] = chapter_title
                if not chapter_obj["volume"]:
                    chapter_obj["volume"] = chapter_volume
                if chapter_timestamp > chapter_obj["last_updated"]:
                    chapter_obj["last_updated"] = chapter_timestamp
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
                    "release_date": {groups_map[chapter_group]: chapter_timestamp},
                    "last_updated": chapter_timestamp,
                }

        chapter_list = [
            [
                ch[0],
                ch[0],
                ch[1]["title"],
                ch[0].replace(".", "-"),
                "Multiple Groups"
                if len(ch[1]["groups"]) > 1
                else groups_dict[list(ch[1]["groups"].keys())[0]],
                "No date."
                if not ch[1]["last_updated"]
                else self.date_parser(ch[1]["last_updated"]),
                ch[1]["volume"] or "Unknown",
            ]
            for ch in sorted(
                chapter_dict.items(), key=lambda m: float(m[0]), reverse=True
            )
        ]

        return {
            "slug": meta_id,
            "title": main_data["data"]["attributes"]["title"][SUPPORTED_LANG],
            "description": main_data["data"]["attributes"]["description"][
                SUPPORTED_LANG
            ],
            "author": "",  # TODO
            "artist": "",  # TODO
            "groups": groups_dict,
            "chapter_dict": chapter_dict,
            "chapter_list": chapter_list,
            "cover": "https://pbs.twimg.com/profile_images/1323198105634902018/Ramm0Zfc_400x400.jpg",  # TODO placeholder
        }

    @api_cache(prefix="md_series_dt", time=600)
    def series_api_handler(self, meta_id):
        data = self.md_api_common(meta_id)
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

    @api_cache(prefix="md_chapter_dt", time=600)
    def chapter_api_handler(self, meta_id):
        resp = get_wrapper(
            f"https://api.mangadex.org/chapter/{meta_id}",
            headers={"Referer": "https://mangadex.org"},
        )
        if resp.status_code == 200:
            api_data = resp.json()
            resp = get_wrapper(
                f"https://api.mangadex.org/at-home/server/{api_data['data']['id']}",
                headers={"Referer": "https://mangadex.org"},
            )
            if resp.status_code == 200:
                server_base = resp.json()["baseUrl"]
                pages = [
                    f"{server_base}/data/{api_data['data']['attributes']['hash']}/{page}"
                    for page in api_data["data"]["attributes"]["data"]
                ]
                series = None
                chapter = api_data["data"]["attributes"]["chapter"]
                for relationship in api_data["relationships"]:
                    if relationship["type"] == "manga":
                        series = relationship["id"]
                        break

                return ChapterAPI(pages=pages, series=series, chapter=chapter)

    @api_cache(prefix="md_series_page_dt", time=600)
    def series_page_handler(self, meta_id):
        data = self.md_api_common(meta_id)
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
                original_url=f"https://mangadex.org/{data['slug']}",
            )

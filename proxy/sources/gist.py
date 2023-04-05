from datetime import datetime
from json.decoder import JSONDecodeError
import random
import binascii
from urllib.parse import ParseResult, urlparse
from typing import Dict, Tuple

from django.shortcuts import redirect
from django.urls import re_path
from requests.models import Response

from ..source import ProxySource
from ..source.data import ProxyException, SeriesAPI, SeriesPage, WrappedProxyDict
from ..source.helpers import api_cache, decode, encode, get_wrapper
from ..source.markdown_parser import parse_html

"""
Expected format of the raw gists should be:
{
    "title": "<required, str>",
    "description": "<required, str>",
    "artist": "<optional, str>",
    "author": "<optional, str>",
    "cover": "<optional, str>",
    "chapters": {
        "1": {
            "title": "<optional, str>",
            "volume": "<optional, str>",
            "groups": {
                "<group name>": "<proxy url>",
                OR
                "<group name>": [
                    "<url to page 1>",
                    "<url to page 2>",
                    ...
                ]
            },
            "last_updated": "<optional, unix timestamp>",
        },
        "2": {
            ...
        },
        ...
    }
}
Make sure you pass in the shortened key from git.io.
"""


DOMAIN_MAPPING: Dict[str, str] = {
    "gist": "https://gist.githubusercontent.com/",
    "raw": "https://raw.githubusercontent.com/",
}


class Gist(ProxySource):
    def get_reader_prefix(self):
        return "gist"

    def shortcut_instantiator(self):
        def gitio_handler(request, gist_hash: str):
            # While git.io allows vanity URLs with special characters, chances are
            # they won't parse properly by a regular browser. So we don't deal with it
            return redirect(f"reader-{self.get_reader_prefix()}-series-page", gist_hash)

        def gist_raw_handler(request, raw_url: str):
            if not raw_url.startswith("http"):
                raw_url = "https://" + raw_url
            parsed_url: ParseResult = urlparse(raw_url)
            location: str = parsed_url.netloc.split(".")[0]
            if parsed_url.netloc not in DOMAIN_MAPPING.get(location, ""):
                raise ProxyException("This URL doesn't point to a GitHub-owned domain.")

            return redirect(
                f"reader-{self.get_reader_prefix()}-series-page",
                encode(location + parsed_url.path),
            )

        return [
            re_path(r"^(?:gitio)/(?P<gist_hash>[\d\w/]+)/$", gitio_handler),
            re_path(r"^(?:gist|gh)/(?P<raw_url>.+)", gist_raw_handler),
        ]

    def process_description(self, desc):
        return parse_html(desc)

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

    @staticmethod
    def chapter_parser(chapter: str):
        try:
            return float(chapter)
        except ValueError as e:
            raise ProxyException(f"Failed to parse chapter as a number: {e}")

    @staticmethod
    def request_handler(meta_id: str) -> Tuple[str, Response]:
        """
        Handler that supports legacy git.io links, as well as the newest schema.

        :return: tuple of the original URL and request response
        """
        try:
            decoded_identifier: str = decode(meta_id)

            if "/" not in decoded_identifier:
                raise ValueError(
                    "Decoded value isn't slash-separated, falling back to git.io"
                )

            location: str
            path: str
            location, path = decoded_identifier.split("/", 1)
            if location not in DOMAIN_MAPPING:
                raise ProxyException(
                    "Domain fragment doesn't start with one of: "
                    + ", ".join(DOMAIN_MAPPING.keys())
                )

            url: str = DOMAIN_MAPPING[location] + path
            resp: Response = get_wrapper(f"{url}?{random.random()}")

        except (binascii.Error, ValueError):
            # If it fails to decode, it's _probably_ a legacy git.io link
            url: str = f"https://git.io/{meta_id}"
            resp: Response = get_wrapper(
                f"https://git.io/{meta_id}", allow_redirects=False
            )

            if resp.status_code not in [301, 302] or not resp.headers["location"]:
                raise ProxyException("The git.io redirect did not succeed.")

            resp: Response = get_wrapper(
                f"{resp.headers['location']}?{random.random()}"
            )

        return (url, resp)

    @api_cache(prefix="gist_common_dt", time=300)
    def gist_common(self, meta_id):
        original_url: str
        resp: Response
        original_url, resp = self.request_handler(meta_id)

        if not resp.headers["content-type"].startswith("text/plain"):
            raise ProxyException("The requested content doesn't direct to a raw file.")

        if resp.status_code == 200:
            try:
                api_data = WrappedProxyDict(resp.json())
            except JSONDecodeError as e:
                raise ProxyException(f"Invalid JSON: {e}")

            title = api_data.get("title", exception="Gist is missing a title.")
            description = api_data.get(
                "description", exception="Gist is missing a description."
            )
            chapters = api_data.get(
                "chapters",
                exception="Gist is missing a chapters object.",
            )

            artist = api_data.get("artist", "")
            author = api_data.get("author", "")
            cover = api_data.get("cover", "")

            groups_set = {
                group
                for ch, ch_data in chapters.items()
                for group in WrappedProxyDict(ch_data)
                .get(
                    "groups",
                    exception=f"Chapter {ch} is missing a groups object.",
                )
                .keys()
            }
            groups_dict = {str(key): value for key, value in enumerate(groups_set)}
            groups_map = {value: str(key) for key, value in enumerate(groups_set)}

            chapter_dict = {
                ch: {
                    "volume": ch_data.get("volume", "Uncategorized"),
                    "title": ch_data.get("title", "No Title"),
                    "groups": {
                        groups_map[group]: [
                            {
                                "src": sub["src"],
                                "description": sub["description"],
                            }
                            if type(sub) is dict
                            else sub
                            for sub in metadata
                        ]
                        if type(metadata) is list
                        else metadata
                        for group, metadata in ch_data["groups"].items()
                    },
                    "release_date": {
                        groups_map[group]: ch_data.get("last_updated", None)
                        for group in ch_data["groups"].keys()
                        if "last_updated" in ch_data
                    },
                    "last_updated": ch_data.get("last_updated", None),
                }
                for ch, ch_data in chapters.items()
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
                    ch[1]["volume"],
                ]
                for ch in sorted(
                    chapter_dict.items(),
                    key=lambda m: self.chapter_parser(m[0]),
                    reverse=True,
                )
            ]

            # We'll do a last pass over the data to purge the release_date keys if
            # they doesn't exist. It's ugly but it's for the external consumers of our API
            for md in chapter_dict.values():
                del md["last_updated"]
                if not md["release_date"]:
                    del md["release_date"]

            metadata = [
                [
                    "Author",
                    author or "Unknown",
                ],
                [
                    "Artist",
                    artist or "Unknown",
                ],
            ]

            return {
                "slug": meta_id,
                "title": title,
                "description": description,
                "series": title,
                "cover_vol_url": cover,
                "metadata": metadata,
                "author": author,
                "artist": artist,
                "groups": groups_dict,
                "cover": cover,
                "chapter_dict": chapter_dict,
                "chapter_list": chapter_list,
                "original_url": original_url,
            }
        else:
            raise ProxyException("Failed to resolve the given URL.")

    @api_cache(prefix="gist_dt", time=300)
    def series_api_handler(self, meta_id):
        data = self.gist_common(meta_id)
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

    def chapter_api_handler(self, meta_id):
        pass

    @api_cache(prefix="gist_page_dt", time=300)
    def series_page_handler(self, meta_id):
        data = self.gist_common(meta_id)
        if data:
            return SeriesPage(
                series=data["title"],
                alt_titles=[],
                alt_titles_str=None,
                slug=data["slug"],
                cover_vol_url=data["cover"],
                metadata=data["metadata"],
                synopsis=data["description"],
                author=data["artist"],
                chapter_list=data["chapter_list"],
                original_url=data["original_url"],
            )
        else:
            return None

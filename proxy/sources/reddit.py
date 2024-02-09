import re
from datetime import datetime

from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, ProxyException, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper


class Reddit(ProxySource):
    def get_reader_prefix(self):
        return "reddit"

    def shortcut_instantiator(self):
        def handler(request, meta_id):
            return redirect(
                f"reader-{self.get_reader_prefix()}-chapter-page",
                meta_id,
                "1",
                "1",
            )

        return [
            re_path(r"^(?:reddit|r/[a-z0-9_]+/comments)/(?P<meta_id>[\d\w]+)", handler),
            re_path(r"^(?:gallery)/(?P<meta_id>[\d\w]+)", handler),
        ]

    @staticmethod
    def image_url_handler(url):
        # transform thumbnail link from https://preview.redd.it/media_id.ext?junk
        #                           to https://i.redd.it/media_id.ext
        return re.sub(r"\?.*", "", url.replace("preview.redd.it", "i.redd.it"))

    async def reddit_api(self, meta_id):
        resp = await get_wrapper(
            f"https://old.reddit.com/{meta_id}.json",
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:122.0) Gecko/20100101 Firefox/122.0",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            allow_redirects=True,
        )

        if resp.status != 200:
            raise ProxyException("The reddit API didn't return properly.")

        api_data = await resp.json()
        try:
            if isinstance(api_data, list):
                api_data = api_data[0]["data"]["children"][0]["data"]
            else:
                api_data = api_data["data"]["children"][0]["data"]
        except (ValueError, TypeError):
            raise ProxyException(f"Failed to deserialize reddit response.")

        if (
            "is_gallery" not in api_data
            or not api_data["is_gallery"]
            or api_data["removed_by_category"] != None
        ):
            raise ProxyException("This reddit link doesn't resolve to a gallery.")

        try:
            date = datetime.utcfromtimestamp(api_data["created"])
        except ValueError:
            date = datetime.now()

        images = []
        for image in api_data["gallery_data"]["items"]:
            metadata = api_data["media_metadata"][image["media_id"]]
            if metadata["status"] != "valid" or metadata["e"] != "Image":
                continue
            url = self.image_url_handler(metadata["s"]["u"])
            images.append(url)
        if not images:
            raise ProxyException("Couldn't find any images.")

        return {
            "slug": meta_id,
            "title": api_data["title"],
            "description": "No description",
            "author": "Unknown",
            "artist": "Unknown",
            "cover": images[0],
            "groups": {"1": "Reddit"},
            "chapter_dict": {
                "1": {
                    "volume": "1",
                    "title": api_data["title"],
                    "groups": {"1": images},
                }
            },
            "chapter_list": [
                [
                    "1",
                    "1",
                    api_data["title"],
                    "1",
                    "No group",
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
            "pages_list": images,
            "original_url": f"https://www.reddit.com{api_data['permalink']}",
        }

    @api_cache(prefix="reddit_series_dt", time=300)
    async def series_api_handler(self, meta_id):
        data = await self.reddit_api(meta_id)
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

    @api_cache(prefix="reddit_pages_dt", time=300)
    async def chapter_api_handler(self, meta_id):
        data = await self.reddit_api(meta_id)
        return (
            ChapterAPI(
                pages=data["pages_list"], series=data["slug"], chapter=data["slug"]
            )
            if data
            else None
        )

    @api_cache(prefix="reddit_series_page_dt", time=300)
    async def series_page_handler(self, meta_id):
        data = await self.reddit_api(meta_id)
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

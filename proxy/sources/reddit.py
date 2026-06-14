import html
import re
from datetime import datetime
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from django.shortcuts import redirect
from django.urls import re_path
from django.conf import settings

from ..source import ProxySource
from ..source.data import ChapterAPI, ProxyException, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper

class Reddit(ProxySource):
    REDLIB_BASE_URL = settings.EXTERNAL_REDLIB_URL

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
            re_path(
                r"^(?:reddit|r/[a-zA-Z0-9_]+/comments)/(?P<meta_id>[\d\w]+)",
                handler,
            ),
            re_path(r"^(?:gallery)/(?P<meta_id>[\d\w]+)", handler),
        ]

    @staticmethod
    def image_url_handler(url):
        url = html.unescape(url or "").strip()
        if not url:
            return ""

        parsed = urlparse(url)

        if url.startswith("/preview/"):
            filename = parsed.path.rstrip("/").split("/")[-1]
            return f"https://i.redd.it/{filename}"

        if parsed.path.startswith("/preview/"):
            filename = parsed.path.rstrip("/").split("/")[-1]
            return f"https://i.redd.it/{filename}"

        url = re.sub(r"\?.*", "", url)
        url = url.replace("preview.redd.it", "i.redd.it")

        return url

    @staticmethod
    def _parse_redlib_date(date_str):
        if not date_str:
            return datetime.now()

        date_str = date_str.strip()

        for fmt in (
            "%b %d %Y, %H:%M:%S UTC",
            "%b %d %Y, %H:%M:%S",
        ):
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                pass

        return datetime.now()

    def _redlib_post_url(self, meta_id):
        return urljoin(self.REDLIB_BASE_URL.rstrip("/") + "/", f"{meta_id}/")

    def _extract_original_url(self, soup, meta_id):
        reddit_popup = soup.select_one("#reddit_url")
        if reddit_popup:
            text = reddit_popup.get_text(strip=True)
            if text:
                return text

        reddit_link = soup.select_one('a[href*="reddit.com"]')
        if reddit_link and reddit_link.get("href"):
            return reddit_link["href"]

        og_url = soup.select_one('meta[property="og:url"]')
        if og_url and og_url.get("content"):
            content = og_url["content"]
            if content.startswith("http"):
                return content
            return f"https://www.reddit.com{content}"

        permalink = soup.select_one(".post_footer a[href*='/comments/']")
        if permalink and permalink.get("href"):
            href = permalink["href"]
            if href.startswith("http"):
                return href
            return f"https://www.reddit.com{href}"

        return f"https://www.reddit.com/comments/{meta_id}"

    def redlib_gallery(self, meta_id):
        resp = get_wrapper(
            self._redlib_post_url(meta_id),
            allow_redirects=True
        )

        if resp.status_code != 200:
            raise ProxyException("Unable to fetch post.")
        
        soup = BeautifulSoup(resp.text, "html.parser")

        post = soup.select_one("div.post.highlighted") or soup.select_one("div.post")
        if not post:
            raise ProxyException("Unable to fetch post.")

        gallery = post.select_one(".gallery")
        if not gallery:
            raise ProxyException("Cubari only supports reddit galleries.")

        images = []
        for link in gallery.select("figure a[href]"):
            image_url = self.image_url_handler(link.get("href"))
            if image_url.startswith("https://i.redd.it/"):
                images.append(image_url)

        images = list(dict.fromkeys(images))

        if not images:
            raise ProxyException("Couldn't parse out any images from the gallery.")

        title_el = post.select_one(".post_title")
        title_meta = soup.select_one('meta[name="title"], meta[property="og:title"]')

        if title_el:
            title = title_el.contents[-1].strip()
        elif title_meta and title_meta.get("content"):
            title = title_meta["content"].strip()
        else:
            title = "No Title."

        author_el = post.select_one(".post_author")
        author_meta = soup.select_one('meta[name="author"]')

        if author_el:
            author = author_el.get_text(" ", strip=True)
        elif author_meta and author_meta.get("content"):
            author = author_meta["content"].strip()
        else:
            author = "N/A"

        username_prefix = "u/"
        author = author[author.startswith(username_prefix) and len(username_prefix):]

        created_el = post.select_one(".created[title]")
        date = self._parse_redlib_date(
            created_el.get("title") if created_el else None
        )

        original_url = self._extract_original_url(soup, meta_id)

        return {
            "slug": meta_id,
            "title": title,
            "description": "No description.",
            "author": author,
            "artist": "Unknown",
            "cover": images[0],
            "groups": {"1": "Reddit"},
            "chapter_dict": {
                "1": {
                    "volume": "1",
                    "title": title,
                    "groups": {"1": images},
                }
            },
            "chapter_list": [
                [
                    "1",
                    "1",
                    title,
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
            "original_url": original_url,
        }

    def reddit_api(self, meta_id):
        return self.redlib_gallery(meta_id)

    @api_cache(prefix="reddit_series_dt", time=3600)
    def series_api_handler(self, meta_id):
        data = self.redlib_gallery(meta_id)

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

    @api_cache(prefix="reddit_pages_dt", time=3600)
    def chapter_api_handler(self, meta_id):
        data = self.redlib_gallery(meta_id)

        return (
            ChapterAPI(
                pages=data["pages_list"],
                series=data["slug"],
                chapter="1",
            )
            if data
            else None
        )

    @api_cache(prefix="reddit_series_page_dt", time=3600)
    def series_page_handler(self, meta_id):
        data = self.redlib_gallery(meta_id)

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
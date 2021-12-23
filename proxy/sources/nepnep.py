import json
import re
from datetime import datetime

from bs4 import BeautifulSoup
from django.conf import settings
from django.shortcuts import redirect
from django.urls import re_path

from ..source import ProxySource
from ..source.data import ChapterAPI, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, get_wrapper

class NepNep(ProxySource):
    def get_reader_prefix(self):
        return "mangasee"

    def shortcut_instantiator(self):
        def handler(request, raw_url):
            if "/read-online/" in raw_url:
                slug_name = self.get_slug_name(self.normalize_slug(raw_url))
                data = self.nn_scrape_common(slug_name)
                canonical_chapter = self.parse_chapter(raw_url)
                canonical_chapter = data["cmap"][canonical_chapter]
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

        return [
            re_path(r"^ms/(?P<raw_url>[\w\d\/:.-]+)", handler),
            re_path(r"^ml/(?P<raw_url>[\w\d\/:.-]+)", handler)
        ]

    @staticmethod
    def normalize_slug(denormal):
        denormal = denormal.strip('/').replace('.html', '')
        if "/read-online/" in denormal:
            copy = denormal
            denormal = [part for part in denormal.replace('/read-online/', '/manga/').split('-chapter-')[0].split('/') if part]
            if copy.startswith('http'):
                denormal.pop(0)
            denormal = 'https://' + '/'.join(denormal)
        return denormal

    @staticmethod
    def get_slug_name(normalized_url):
        return normalized_url.split("/")[-1]

    @staticmethod
    def parse_chapter(raw_url):
        raw_url = raw_url.strip('/').replace('.html', '')
        raw_split = raw_url.split('-')
        if 'index' in raw_url:
            if 'page' in raw_url:
                chapter = raw_split[-3] + raw_split[-5]
            else:
                chapter = raw_split[-1] + raw_split[-3]
        else:
            if 'page' in raw_url:
                chapter = "1" + raw_split[-3]
            else:
                chapter = "1" + raw_split[-1]
        return chapter #format: Season(1)Page(...)            

    @staticmethod        
    def parse_chapter_number(number):
        _int = re.sub(r'^0+', '', number[1:])[:-1] 
        _frac = number[-1]
        if _int == '' and _frac == '0': #Handling chapter 0
            return _frac
        elif _frac == '0':
            return _int
        else:
            return _int + "." + str(_frac)

    @classmethod
    def generate_chapter_url(cls, series_url, series_chapter_number):
        _ = series_chapter_number
        return series_url.replace('/manga/', '/read-online/') + '-chapter-' + cls.parse_chapter_number(_) + ('-index-' + _[0] if _[0] != '1' else '')
    
    def generate_cmap(self, series_url, chapter_data):
        cmap = {}
        ch = len(chapter_data)
        for chapter in chapter_data:
            cmap[self.parse_chapter(self.generate_chapter_url(series_url, chapter['Chapter']))] = str(ch)
            ch -= 1
        return cmap

    @api_cache(prefix="nn_common_scrape_dt", time=600)
    def nn_scrape_common(self, meta_id):
        series_url = 'https://mangasee123.com/manga/' + meta_id
        resp = get_wrapper(series_url)
        if resp.status_code == 200:
            data = resp.text
            soup = BeautifulSoup(data, "html.parser")

            try:
                title = soup.find("h1").text
            except AttributeError:
                return None

            author = "None"
            description = "No Description."
            for _ in soup.find_all("span", class_ = "mlabel"):
                if("Author" in _.text):
                    author = _.findNext().text
                elif("Description" in _.text):
                    description = _.findNext().text

            try:
                cover = soup.find_all("img")[3]["src"]
            except IndexError:
                cover = ""
            groups_dict = {"1": "MangaSee/MangaLife"}

            chapter_list = []
            series_page_chapter_list = []
            chapter_dict = {}

            m = re.search(r'vm\.Chapters\s?=\s?.+\]', data)
            try:
                chapter_data = re.split(r'vm\.Chapters\s?=\s', m.group(0))[1]
                if chapter_data == '':
                    return None
            except IndexError:
                return None

            chapter_data = json.loads(chapter_data)
            cmap = self.generate_cmap(series_url, chapter_data)

            chapters = list(
                map(
                    lambda a: [
                        a['Type'] + " " + self.parse_chapter_number(a['Chapter']),
                        self.generate_chapter_url(series_url, a['Chapter']),
                        a['Date'].split(" ")[0] if a['Date'] else "No Date."
                    ],
                    chapter_data,
                )
            )

            for chapter in chapters:
                canonical_chapter = self.parse_chapter(chapter[1])
                canonical_chapter = cmap[canonical_chapter]
                chapter_list.append(
                    [
                        "",
                        canonical_chapter,
                        chapter[0],
                        canonical_chapter.replace(".", "-"),
                        "MangaSee",
                        chapter[2],
                        "",
                    ]
                )

                series_page_chapter_list.append(
                    [
                        "",
                        canonical_chapter,
                        canonical_chapter + " : " + chapter[0],
                        canonical_chapter.replace(".", "-"),
                        "MangaSee",
                        chapter[2],
                        "",
                    ]
                )

                chapter_dict[canonical_chapter] = {
                    "volume": "1",
                    "title": chapter[0],
                    "groups": {"1": self.wrap_chapter_meta(self.get_slug_name(chapter[1]))},
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
                "series_page_chapter_list": series_page_chapter_list,
                "cmap": cmap
            }
        else:
            return None

    def series_api_handler(self, meta_id):
        data = self.nn_scrape_common(meta_id)
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

    @api_cache(prefix="nn_chapter_dt", time=3600)
    def chapter_api_handler(self, meta_id):
        chapter_url = 'https://mangasee123.com/read-online/' + meta_id
        resp = get_wrapper(chapter_url)
        if resp.status_code == 200:
            data = resp.text

            try:
                m = re.search(r'vm\.CurChapter\s?=\s?.+\;', data)
                ch_info = json.loads(re.split(r'vm\.CurChapter\s?=\s', m.group(0))[1].strip(';'))
                total_pages = int(ch_info['Page'])
                current_chapter = self.parse_chapter_number(ch_info['Chapter'])
                season = ch_info['Directory']

                m = re.search(r'vm\.CurPathName\s?=\s?.+\;', data)
                chapter_host = re.split(r'vm\.CurPathName\s?=\s', m.group(0))[1].strip(';"')

                m = re.search(r'vm\.IndexName\s?=\s?.+\;', data)
                slug_name = re.split(r'vm\.IndexName\s?=\s', m.group(0))[1].strip(';"')

                if ch_info == '' or chapter_host == '' or slug_name == '':
                    return None

            except IndexError:
                return None

            pages = []
            for i in range(1, total_pages + 1):
                padded_chapter = '0000' + current_chapter
                stuffed_chapter = padded_chapter[(len(padded_chapter) - 4) if '.' not in current_chapter else len(padded_chapter) - 6:]
                padded_page = '000' + str(i)
                stuffed_page = padded_page[len(padded_page) - 3:]
                pages.append('https://' + chapter_host + '/manga/' + slug_name + "/" + season + ('/' if season else '') + stuffed_chapter + '-' + stuffed_page + '.png') 
            pages = [self.wrap_image_url(page) for page in pages]
            return ChapterAPI(pages=pages, series=meta_id, chapter="")
        else:
            return None

    def series_page_handler(self, meta_id):
        data = self.nn_scrape_common(meta_id)
        original_url = 'https://mangasee123.com/manga/' + meta_id
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
                chapter_list=data["series_page_chapter_list"],
                original_url=original_url,
            )
        else:
            return None

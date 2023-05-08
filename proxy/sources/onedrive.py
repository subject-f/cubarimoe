from datetime import datetime

from django.shortcuts import redirect
from django.urls import re_path
from django.conf import settings

from ..source import ProxySource
from ..source.data import ChapterAPI, ProxyException, SeriesAPI, SeriesPage
from ..source.helpers import api_cache, encode, get_wrapper
from json import JSONDecodeError
from requests import RequestException, HTTPError

import re

class OneDrive(ProxySource):
    '''
        Receives a OneDrive share URL
        Will parse subfolders up to one level: "[Artist] Series Title/Ch. 01 - Chapter Title/images.ext" OR "Title/images.ext"
            Expects chapter folders to be prefixed by the number, will abstact 'Ch.' and 'Chapter' prefixes
        Series title will be the top-most folder name
        If chapter number can't be guessed from folder title, assumes 1.
            Meaning unidentified subfolders will result in a single chapter with all images
        Chapter will be blank if it can't be parsed from sub-folder name
        Cover will be the first `cover.ext` found in the tree or page 1 of chapter 1
        Doesn't support volumes, always "Uncategorized"
    '''

    def get_reader_prefix(self):
        return "onedrive"

    def shortcut_instantiator(self):
        def handler(request, series_id):
            return redirect(
                f"reader-{self.get_reader_prefix()}-chapter-page", series_id)

        return [
            re_path(r"(?:1drv)/(?P<series_id>[\d\w]+)/$", handler),
        ]

    @staticmethod
    def date_parser(timestamp: float):
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

    @api_cache(prefix="od_common_dt", time=300)
    def od_common(self, meta_id):

        def od_api(share_id: str) -> dict:
            map = {'folders': [], 'files': []}
            od_series_api = f"https://api.onedrive.com/v1.0/shares/{share_id}/driveItem?$expand=children"
            resp = get_wrapper(od_series_api)

            if not resp.ok:
                resp = get_wrapper(od_series_api, use_proxy=True)

            try:
                resp.raise_for_status()
                resp = resp.json()
            except (HTTPError, JSONDecodeError, RequestException) as error:
                raise ProxyException(f'Could not parse OneDrive folder `{share_id}`: {error}')

            map['title'] = resp['name']
            try:
                map['date'] = datetime.fromisoformat(
                        f"{resp.get('lastModifiedDateTime', '')[:19]}+00:00"
                    ).timestamp()
            except ValueError:
                map['date'] = datetime.utcnow().timestamp()

            for contents in resp['children']:
                if 'file' in contents and (
                    'image' in contents
                    or 'image' in contents.get('file', {}).get('mimeType', '')
                ):
                    if contents['name'].startswith('cover.'):
                        map['cover'] = contents['@content.downloadUrl']
                        continue
                    map['files'].append(contents['@content.downloadUrl'])
                if 'folder' in contents:
                    map['folders'].append(contents.get('webUrl').split('/')[-1])
            if not map.get('cover') and map['files']:
                map['cover'] = map['files'][0]
            return map

        chapters_dict = {
            '1': { 
                'title': '',
                'last_updated': None,
                'groups': {
                    'OneDrive': []
                }
            }
        }
        series_dict = {
            'title': '',
            'description': '',
            'artist': None,
            'author': None,
            'cover': None,
        }
        series = od_api(meta_id)
        series_dict['title'] = self.parse_title(series['title'])[1]
        has_artist = re.search(r'^\[(.+?)\] ', series['title'], re.IGNORECASE)
        series_dict['artist'] = has_artist.group(1) if has_artist else 'Unknown'
        series_dict['alt_title'] = series_dict['title'].replace(has_artist.group(), '') if has_artist else ''
        series_dict['cover'] = series.get('cover')

        if series.get('files'):
            chapters_dict['1'] = {
                'title': series['title'],
                'last_updated': series['date'],
                'groups': {
                    'OneDrive': series['files']
                }
            }

        for subfolder in series.get('folders', {}):
            folder = od_api(subfolder)
            if not folder['files']:
                continue
            if not series_dict['cover']:
                series_dict['cover'] = folder['files'][0]
            title = self.parse_title(folder['title'])
            chapters_dict[title[0]] = {
                    'title': title[1],
                    'last_updated': folder['date'],
                    'groups': {'OneDrive': folder['files']}
            }
        series_dict['chapters'] = chapters_dict

        chapter_list = [
            [
                ch[0],  # Chapter Number
                ch[0],  # Chapter Number
                ch[1]["title"], # Chapter Title
                ch[0].replace(".", "-"),    # Chapter Slug
                "OneDrive",  # Group
                self.date_parser(ch[1]["last_updated"]),   # Date
                'Uncatecorized',    # Volume Number
            ]
            for ch in sorted(
                chapters_dict.items(),
                key=lambda m: float(m[0]),
                # reverse=True,
            )
        ]
        groups_dict = {str(key): 'OneDrive' for key in chapters_dict}

        return {
            "slug": meta_id,
            "title": series_dict['title'],
            "alt_title": series_dict['alt_title'],
            "description": "",
            "artist": series_dict['artist'],
            "cover": series_dict['cover'],
            "chapters": chapters_dict,
            "chapter_list": chapter_list,
            'groups': groups_dict,
            "timestamp": series['date'],
        }

    def parse_title(self, title: str) -> tuple:
        search = re.search(
            r'^(?:Ch\.? ?|Chapter )?0?([\d\.,]{1,5})(?: - )?', title, re.IGNORECASE
        )
        ch = search.group(1) if search else '1'
        ch_title = title if not search else title.replace(search.group(), '')
        return (ch, ch_title)

    @api_cache(prefix="od_series_dt", time=300)
    def series_api_handler(self, meta_id):
        data = self.od_common(meta_id)
        return SeriesAPI(
            slug=meta_id,
            title=data["title"],
            description=data["description"],
            author=data["artist"],
            artist=data["artist"],
            groups=data['groups'],
            cover=data["cover"],
            chapters=data["chapters"],
        ) if data else None

    @api_cache(prefix="od_pages_dt", time=300)
    def chapter_api_handler(self, meta_id):
        data = self.od_common(meta_id)
        return ChapterAPI(
            pages=data['chapters']['1']['groups']['OneDrive'],
            series=data['slug'],
            chapter='1',
        ) if data else None

    @api_cache(prefix="od_series_page_dt", time=300)
    def series_page_handler(self, meta_id):
        data = self.od_common(meta_id)
        return SeriesPage(
            series=data["title"],
            alt_titles=[data["alt_title"]],
            alt_titles_str=data["alt_title"],
            slug=data["slug"],
            cover_vol_url=data["cover"],
            metadata=[["Author", data["artist"]], ["Artist", data["artist"]]],
            synopsis=data['description'],
            author=data["artist"],
            chapter_list=data['chapter_list'],
            original_url=f"https://1drv.ms/f/{meta_id}",
        ) if data else None

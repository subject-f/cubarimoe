class SeriesAPI:
    def __init__(self, **kwargs):
        self.args = kwargs

    def objectify(self):
        chapters = {}

        for chapter, chapter_data in self.args["chapters"].items():
            for group_id, group_pages in chapter_data["groups"].items():
                if chapter not in chapters:
                    chapters[chapter] = {}
                chapters[chapter][group_id] = {
                    "title": chapter_data.get("title", "No title"),
                    "volume": chapter_data.get("volume", None),
                }
                if type(group_pages) is str:
                    chapters[chapter][group_id]["_images"] = group_pages
                elif type(group_pages) is list:
                    base = None
                    for page in group_pages:
                        if base is None:
                            base = page
                        else:
                            if len(base) > len(page):
                                base = base[: len(page)]
                            for i, (c1, c2) in enumerate(zip(page, base)):
                                if c1 != c2:
                                    base = base[:i]
                                    break
                    chapters[chapter][group_id]["base"] = base
                    chapters[chapter][group_id]["images"] = [
                        p.replace(base, "", 1) for p in group_pages
                    ]

        return {
            "slug": self.args["slug"],
            "title": self.args["title"],
            "alttitles": self.args.get("alt_titles", []),
            "description": self.args["description"],
            "author": self.args["author"],
            "artist": self.args["artist"],
            "groups": self.args["groups"],
            "cover": self.args["cover"],
            "chapters": chapters,
            "series_name": self.args["title"],
        }


class SeriesPage:
    def __init__(self, **kwargs):
        self.args = kwargs

    def objectify(self):
        return {
            "series": self.args["series"],
            "alt_titles": self.args["alt_titles"],
            "alt_titles_str": self.args["alt_titles_str"],
            "slug": self.args["slug"],
            "cover_vol_url": self.args["cover_vol_url"],
            "metadata": self.args["metadata"],
            "synopsis": self.args["synopsis"],
            "author": self.args["author"],
            "chapter_list": self.args["chapter_list"],
            "original_url": self.args["original_url"],
            "available_features": ["detailed"],
        }


class ChapterAPI:
    def __init__(self, **kwargs):
        self.args = kwargs

    def objectify(self):
        return {
            "series": self.args["series"],
            "pages": self.args["pages"],
            "chapter": self.args["chapter"],
        }

from .sources.foolslide import FoolSlide
from .sources.imgur import Imgur
from .sources.mangabox import MangaBox
from .sources.mangadex import MangaDex
from .sources.nhentai import NHentai
from .sources.readmanhwa import ReadManhwa
from .sources.hitomi import Hitomi
from .sources.gist import Gist
from .sources.mangakatana import MangaKatana
from .sources.nepnep import NepNep
from .sources.imgbox import Imgbox

sources = [
    MangaDex(),
    NHentai(),
    FoolSlide(),
    ReadManhwa(),
    Imgur(),
    MangaBox(),
    Hitomi(),
    Gist(),
    MangaKatana(),
    NepNep(),
    Imgbox(),
]
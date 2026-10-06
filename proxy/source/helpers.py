import asyncio
import base64

from django.core.cache import cache
from django.conf import settings
from urllib.parse import urlparse
import aiohttp

from .data import ProxyException
from .session import ProxyResponse, get_session

ENCODE_STR_SLASH = "%FF-"
ENCODE_STR_QUESTION = "%DE-"
GLOBAL_HEADERS = {
    "User-Agent": "Mozilla Firefox Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:53.0) Gecko/20100101 Firefox/53.0.",
    "x-requested-with": "cubari",
}
PROXY = "https://cubari-cors.herokuapp.com/"

# Mirrors the old requests `timeout=8` (per connect / per read), with an overall cap.
REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=30, connect=8, sock_read=8)
SENSOR_TIMEOUT_PREFIX = "timeout_sensor/"
SENSOR_TIMEOUT_TTL = 10 * 60  # 10 minute timeout on automatic suspension.
SENSOR_TIMEOUT_MAX_FAILURES = (
    25  # 25 requests within 5 minutes time out? Drop the proxy.
)


def naive_encode(url):
    return url.replace("/", ENCODE_STR_SLASH).replace("?", ENCODE_STR_QUESTION)


def naive_decode(url):
    return url.replace(ENCODE_STR_SLASH, "/").replace(ENCODE_STR_QUESTION, "?")


def decode(url: str):
    """Base64 URL decoding wrapper that automatically pads the string."""
    padding: int = 4 - (len(url) % 4)
    return str(base64.urlsafe_b64decode((url + ("=" * padding)).encode()), "utf-8")


def encode(url: str):
    """Base64 URL encoding wrapper that automatically strips the = symbols, ensuring URL safety."""
    return str(base64.urlsafe_b64encode(url.encode()), "utf-8").rstrip("=")


async def sensored_request_handler(req_handler, original_url):
    original_hostname = urlparse(original_url).hostname
    sensor_cache_key = f"{SENSOR_TIMEOUT_PREFIX}{original_hostname}"

    if cache.get(sensor_cache_key, 0) > SENSOR_TIMEOUT_MAX_FAILURES:
        raise ProxyException(
            f"This proxy has temporarily been disabled due to service degradation. Please try again in {SENSOR_TIMEOUT_TTL / 60} minutes."
        )

    try:
        return await req_handler()
    except asyncio.TimeoutError:
        # This isn't atomic, but rather a "best-effort" guard on the number of failures
        cache.set(
            sensor_cache_key, cache.get(sensor_cache_key, 0) + 1, SENSOR_TIMEOUT_TTL
        )
        raise ProxyException("Downstream server timed out. Please try again.")


async def _request(method, url, *, headers, use_proxy, secondary, **kwargs):
    base = settings.EXTERNAL_PROXY_URL if not secondary else settings.SECONDARY_PROXY_URL
    request_url = (
        f"{base}/v1/cors/{encode(url)}?source=cubari_host"
        if use_proxy
        else url
    )

    async def fetch(auto_decompress=True):
        async with get_session().request(
            method,
            request_url,
            headers={**GLOBAL_HEADERS, **headers},
            timeout=REQUEST_TIMEOUT,
            auto_decompress=auto_decompress,
            **kwargs,
        ) as resp:
            return ProxyResponse(resp, await resp.read())

    async def handler():
        try:
            return await fetch()
        except aiohttp.ClientPayloadError:
            if method != "GET":
                raise
            # The CORS proxy labels some plain error bodies (e.g. upstream 404s) as
            # gzip; re-read undecoded so callers still see the real status code.
            return await fetch(auto_decompress=False)

    return await sensored_request_handler(handler, url)


async def get_wrapper(url, *, headers={}, use_proxy=False, secondary=False, **kwargs):
    return await _request(
        "GET", url, headers=headers, use_proxy=use_proxy, secondary=secondary, **kwargs
    )


async def post_wrapper(url, headers={}, use_proxy=False, **kwargs):
    return await _request(
        "POST", url, headers=headers, use_proxy=use_proxy, secondary=False, **kwargs
    )


def api_cache(*, prefix, time):
    def wrapper(f):
        async def inner(self, meta_id):
            data = cache.get(f"{prefix}_{meta_id}")
            if not data:
                data = await f(self, meta_id)
                if not data:
                    return None
                else:
                    cache.set(f"{prefix}_{meta_id}", data, time)
                    return data
            else:
                return data

        return inner

    return wrapper

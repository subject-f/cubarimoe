import asyncio
import json
import ssl
from functools import cached_property

import aiohttp
import certifi

# One pooled client session per worker event loop. Reusing it keeps upstream
# connections (TLS handshakes, DNS lookups) alive across requests.
_session = None
_session_loop = None
_ssl_context = ssl.create_default_context(cafile=certifi.where())


def get_session() -> aiohttp.ClientSession:
    global _session, _session_loop
    loop = asyncio.get_running_loop()
    if _session is None or _session.closed or _session_loop is not loop:
        _session_loop = loop
        _session = aiohttp.ClientSession(
            connector=aiohttp.TCPConnector(
                limit=256, ttl_dns_cache=300, ssl=_ssl_context
            ),
            # requests.get() never persisted cookies; don't share them between users.
            cookie_jar=aiohttp.DummyCookieJar(),
        )
    return _session


async def close_session():
    if _session is not None and not _session.closed:
        await _session.close()


class ProxyResponse:
    """A fully-read response exposing the subset of requests.Response the sources use."""

    def __init__(self, resp: aiohttp.ClientResponse, content: bytes):
        self.status_code = resp.status
        self.headers = resp.headers
        self.url = str(resp.url)
        self.content = content
        self.encoding = resp.get_encoding()

    @property
    def ok(self) -> bool:
        return self.status_code < 400

    @cached_property
    def text(self) -> str:
        return self.content.decode(self.encoding, errors="replace")

    def json(self):
        return json.loads(self.content)

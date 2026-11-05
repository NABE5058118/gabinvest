"""Общий HTTP-клиент (aiohttp) и скачивание изображений."""

import aiohttp

from config import logger

_HTTP_SESSION: aiohttp.ClientSession | None = None
_first_touch_session: aiohttp.ClientSession | None = None


def _get_http_session() -> aiohttp.ClientSession:
    global _HTTP_SESSION
    if _HTTP_SESSION is None or _HTTP_SESSION.closed:
        _HTTP_SESSION = aiohttp.ClientSession()
    return _HTTP_SESSION


async def close_http_session() -> None:
    global _HTTP_SESSION
    if _HTTP_SESSION is not None and not _HTTP_SESSION.closed:
        await _HTTP_SESSION.close()
    _HTTP_SESSION = None


def get_first_touch_session() -> aiohttp.ClientSession:
    """Lazily create one reusable session for attribution calls."""
    global _first_touch_session
    if _first_touch_session is None or _first_touch_session.closed:
        _first_touch_session = aiohttp.ClientSession()
    return _first_touch_session


async def close_first_touch_session() -> None:
    global _first_touch_session
    if _first_touch_session is not None and not _first_touch_session.closed:
        await _first_touch_session.close()
    _first_touch_session = None


async def download_image(url: str, timeout: int = 10) -> bytes | None:
    try:
        async with _get_http_session().get(
            url, timeout=aiohttp.ClientTimeout(total=timeout)
        ) as resp:
            if resp.status == 200:
                return await resp.read()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Object-notify: failed to download image %s: %s", url, exc)
    return None

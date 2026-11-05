"""Безопасность входящих вебхуков: проверка IP-списка и секретов."""

import hmac
import ipaddress

from aiohttp import web

from config import (
    ALLOWED_WEBHOOK_NETWORKS,
    BOT_WEBHOOK_SECRET,
    BOT_WEBHOOK_SECRET_PREVIOUS,
    logger,
)


def webhook_secret_valid(supplied: str) -> bool:
    candidates = [s for s in (BOT_WEBHOOK_SECRET, BOT_WEBHOOK_SECRET_PREVIOUS) if s]
    return bool(supplied) and any(hmac.compare_digest(supplied, s) for s in candidates)


def webhook_ip_allowed(remote: str | None) -> bool:
    if not ALLOWED_WEBHOOK_NETWORKS:
        return True
    if not remote:
        return False
    try:
        address = ipaddress.ip_address(remote)
    except ValueError:
        return False
    return any(address in network for network in ALLOWED_WEBHOOK_NETWORKS)


@web.middleware
async def webhook_guard(request: web.Request, handler):
    if request.path.startswith("/webhook/"):
        if not webhook_ip_allowed(request.remote):
            logger.warning("Webhook rejected by IP allowlist: %s", request.remote)
            return web.json_response({"error": "Forbidden"}, status=403)
        supplied = request.headers.get("x-bot-webhook-secret", "")
        if not webhook_secret_valid(supplied):
            logger.warning(
                "Webhook rejected: invalid shared secret from %s", request.remote
            )
            return web.json_response({"error": "Unauthorized"}, status=401)
    return await handler(request)

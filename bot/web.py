"""Сборка веб-приложения aiohttp, SSL-контекст и запуск сервера."""

import ssl

from aiohttp import web

from config import (
    BOT_WEBHOOK_ALLOWED_IPS,
    BOT_WEBHOOK_CLIENT_CA,
    BOT_WEBHOOK_HOST,
    BOT_WEBHOOK_PORT,
    BOT_WEBHOOK_TLS_CERT,
    BOT_WEBHOOK_TLS_KEY,
    logger,
)
from handlers import (
    handle_lead_notify,
    handle_object_notify,
    handle_status_notify,
)
from security import webhook_guard


def build_web_app() -> web.Application:
    app = web.Application(middlewares=[webhook_guard])
    app.router.add_post("/webhook/lead-notify", handle_lead_notify)
    app.router.add_post("/webhook/notify-status", handle_status_notify)
    app.router.add_post("/webhook/object-notify", handle_object_notify)
    return app


def build_ssl_context() -> ssl.SSLContext | None:
    if not BOT_WEBHOOK_TLS_CERT and not BOT_WEBHOOK_TLS_KEY:
        return None
    if not (BOT_WEBHOOK_TLS_CERT and BOT_WEBHOOK_TLS_KEY):
        raise RuntimeError(
            "BOT_WEBHOOK_TLS_CERT and BOT_WEBHOOK_TLS_KEY must be set together"
        )
    context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    context.minimum_version = ssl.TLSVersion.TLSv1_2
    context.load_cert_chain(BOT_WEBHOOK_TLS_CERT, BOT_WEBHOOK_TLS_KEY)
    if BOT_WEBHOOK_CLIENT_CA:
        context.load_verify_locations(BOT_WEBHOOK_CLIENT_CA)
        context.verify_mode = ssl.CERT_REQUIRED
    return context


async def start_web_server() -> web.AppRunner:
    runner = web.AppRunner(build_web_app())
    await runner.setup()
    ssl_context = build_ssl_context()
    site = web.TCPSite(
        runner,
        host=BOT_WEBHOOK_HOST,
        port=BOT_WEBHOOK_PORT,
        ssl_context=ssl_context,
    )
    await site.start()
    scheme = "https" if ssl_context else "http"
    logger.info(
        "Bot webhook listening on %s://%s:%s (allowlist=%s, mTLS=%s)",
        scheme,
        BOT_WEBHOOK_HOST,
        BOT_WEBHOOK_PORT,
        BOT_WEBHOOK_ALLOWED_IPS or "any",
        bool(BOT_WEBHOOK_CLIENT_CA),
    )
    return runner

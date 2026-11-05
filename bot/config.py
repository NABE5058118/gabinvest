"""Конфигурация и переменные окружения для бота GAB Invest."""

import ipaddress
import logging
import os
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://gabinvest.cloud-ip.cc")
BACKEND_URL = os.getenv("BACKEND_URL", "https://gabinvest.cloud-ip.cc")
ADMIN_TELEGRAM_IDS = os.getenv("ADMIN_TELEGRAM_IDS", "")
BOT_SYNC_SECRET = os.getenv("BOT_SYNC_SECRET", "")
# Inbound webhook secret is deliberately separate from BOT_SYNC_SECRET:
# leaking the webhook secret must not grant access to the backend API.
BOT_WEBHOOK_SECRET = os.getenv("BOT_WEBHOOK_SECRET", "")
BOT_WEBHOOK_SECRET_PREVIOUS = os.getenv("BOT_WEBHOOK_SECRET_PREVIOUS", "")
BOT_WEBHOOK_ALLOWED_IPS = os.getenv("BOT_WEBHOOK_ALLOWED_IPS", "")
BOT_WEBHOOK_HOST = os.getenv("BOT_WEBHOOK_HOST", "0.0.0.0")
BOT_WEBHOOK_PORT = int(os.getenv("BOT_WEBHOOK_PORT", "8080"))
BOT_WEBHOOK_TLS_CERT = os.getenv("BOT_WEBHOOK_TLS_CERT", "")
BOT_WEBHOOK_TLS_KEY = os.getenv("BOT_WEBHOOK_TLS_KEY", "")
BOT_WEBHOOK_CLIENT_CA = os.getenv("BOT_WEBHOOK_CLIENT_CA", "")

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set")
if not BOT_SYNC_SECRET:
    raise RuntimeError("BOT_SYNC_SECRET is not set")
if not BOT_WEBHOOK_SECRET:
    raise RuntimeError("BOT_WEBHOOK_SECRET is not set")

ALLOWED_WEBHOOK_NETWORKS: list = []
for _entry in BOT_WEBHOOK_ALLOWED_IPS.split(","):
    _entry = _entry.strip()
    if not _entry:
        continue
    try:
        ALLOWED_WEBHOOK_NETWORKS.append(ipaddress.ip_network(_entry, strict=False))
    except ValueError as exc:
        raise RuntimeError(
            f"Invalid BOT_WEBHOOK_ALLOWED_IPS entry {_entry!r}: {exc}"
        ) from exc

SEND_SEMAPHORE_LIMIT = 5
MAX_SEND_RETRIES = 3

logger = logging.getLogger(__name__)

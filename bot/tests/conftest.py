"""Общие фикстуры и настройка окружения для тестов бота."""

import os
import sys

# Устанавливаем обязательные переменные окружения до импорта config.py,
# иначе модуль упадёт с RuntimeError при импорте.
os.environ.setdefault("BOT_TOKEN", "test_token_12345")
os.environ.setdefault("BOT_SYNC_SECRET", "test_sync_secret")
os.environ.setdefault("BOT_WEBHOOK_SECRET", "test_webhook_secret")
os.environ.setdefault("WEB_APP_URL", "https://test.example.com")
os.environ.setdefault("BACKEND_URL", "https://test.backend.example.com")
os.environ.setdefault("ADMIN_TELEGRAM_IDS", "111,222")
os.environ.setdefault("BOT_WEBHOOK_ALLOWED_IPS", "")
os.environ.setdefault("BOT_WEBHOOK_HOST", "0.0.0.0")
os.environ.setdefault("BOT_WEBHOOK_PORT", "8080")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

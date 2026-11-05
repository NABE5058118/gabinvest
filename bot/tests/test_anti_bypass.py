"""Тесты для anti_bypass.py — проверка фильтрации сообщений."""

import pytest

from anti_bypass import check_message, is_allowed


class TestIsAllowed:
    """Тесты функции is_allowed."""

    @pytest.mark.parametrize(
        "body",
        [
            "Привет",
            "Как дела?",
            "Объект на продажу",
            "",
            "   ",
        ],
    )
    def test_allowed_messages(self, body):
        """Обычные текстовые сообщения должны проходить."""
        assert is_allowed(body) is True

    @pytest.mark.parametrize(
        "body",
        [
            "+79991234567",
            "89991234567",
            "79991234567890",
            "Звоните 89991234567",
        ],
    )
    def test_blocks_phone(self, body):
        """Телефонные номера должны блокироваться."""
        assert is_allowed(body) is False

    @pytest.mark.parametrize(
        "body",
        [
            "test@example.com",
            "user.name@company.ru",
            "info+tag@gab-invest.ru",
            "Напишите на test@example.com",
        ],
    )
    def test_blocks_email(self, body):
        """Email-адреса должны блокироваться."""
        assert is_allowed(body) is False

    @pytest.mark.parametrize(
        "body",
        [
            "https://example.com",
            "http://site.ru/page",
            "Ссылка: https://gabinvest.cloud-ip.cc",
        ],
    )
    def test_blocks_links(self, body):
        """Ссылки должны блокироваться."""
        assert is_allowed(body) is False

    @pytest.mark.parametrize(
        "body",
        [
            "t.me/username",
            "t.me/joinchat/abc123",
            "Telegram: t.me/gabinvest",
        ],
    )
    def test_blocks_telegram_links(self, body):
        """t.me ссылки должны блокироваться."""
        assert is_allowed(body) is False

    @pytest.mark.parametrize(
        "body",
        [
            "@username",
            "@gab_invest_bot",
            "WhatsApp: +79991234567",
            "Viber: 89991234567",
            "Telegram: @user",
            "Signal: user123",
            "Skype: user.name",
            "Messenger: chat",
        ],
    )
    def test_blocks_messengers(self, body):
        """Мессенджеры и @юзернеймы должны блокироваться."""
        assert is_allowed(body) is False

    @pytest.mark.parametrize(
        "body",
        [
            "vk.com/user",
            "facebook.com/page",
            "instagram.com/user",
            "ok.ru/user",
            "tiktok.com/@user",
            "youtube.com/channel",
            "Группа ВК: vk.com/gabinvest",
        ],
    )
    def test_blocks_socials(self, body):
        """Социальные сети должны блокироваться."""
        assert is_allowed(body) is False

    def test_case_insensitive_messengers(self):
        """Блокировка мессенджеров не зависит от регистра."""
        assert is_allowed("WhatsApp: +79991234567") is False
        assert is_allowed("WHATSAPP: +79991234567") is False
        assert is_allowed("Vk.com/user") is False
        assert is_allowed("VK.COM/user") is False


class TestCheckMessage:
    """Тесты функции check_message — возвращает причину блокировки."""

    @pytest.mark.parametrize(
        "body,expected_reason",
        [
            ("+79991234567", "phone"),
            ("test@example.com", "email"),
            ("https://example.com", "link"),
            ("t.me/user", "telegram"),
            ("@username", "messenger"),
            ("vk.com/user", "social"),
        ],
    )
    def test_returns_correct_reason(self, body, expected_reason):
        """check_message должна возвращать правильную причину блокировки."""
        blocked, reason = check_message(body)
        assert blocked is True
        assert reason == expected_reason

    def test_returns_none_for_allowed(self):
        """Для разрешённых сообщений check_message возвращает (False, None)."""
        blocked, reason = check_message("Привет")
        assert blocked is False
        assert reason is None

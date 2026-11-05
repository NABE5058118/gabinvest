"""Тесты для messaging.py — отправка с повторами при 429."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from messaging import MAX_SEND_RETRIES, send_with_retry


class FakeTelegramError(Exception):
    """Искусственная ошибка Telegram API с retry_after."""

    def __init__(self, message: str, retry_after: int | None = None):
        super().__init__(message)
        self.retry_after = retry_after


class TestSendWithRetry:
    """Тесты функции send_with_retry."""

    @pytest.mark.asyncio
    async def test_success_text_only(self):
        """Успешная отправка текстового сообщения."""
        bot = MagicMock()
        bot.send_message = AsyncMock()

        result = await send_with_retry(bot, 12345, text="Привет")

        assert result is True
        bot.send_message.assert_awaited_once_with(
            chat_id=12345, text="Привет", reply_markup=None, parse_mode=None
        )
        bot.send_photo.assert_not_called()

    @pytest.mark.asyncio
    async def test_success_photo_only(self):
        """Успешная отправка фото."""
        bot = MagicMock()
        bot.send_photo = AsyncMock()
        photo = MagicMock()

        result = await send_with_retry(bot, 12345, photo=photo, caption="Подпись")

        assert result is True
        bot.send_photo.assert_awaited_once_with(
            chat_id=12345,
            photo=photo,
            caption="Подпись",
            reply_markup=None,
            parse_mode=None,
        )
        bot.send_message.assert_not_called()

    @pytest.mark.asyncio
    async def test_no_text_no_photo_returns_false(self):
        """Если нет ни текста, ни фото — возвращаем False без вызовов."""
        bot = MagicMock()
        bot.send_message = AsyncMock()
        bot.send_photo = AsyncMock()

        result = await send_with_retry(bot, 12345)

        assert result is False
        bot.send_message.assert_not_awaited()
        bot.send_photo.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_429_retry_then_success(self):
        """При 429 с retry_after делает повтор и у succeeds."""
        bot = MagicMock()
        bot.send_message = AsyncMock(
            side_effect=[
                FakeTelegramError("Too Many Requests", retry_after=0),
                None,  # success on second attempt
            ]
        )

        result = await send_with_retry(bot, 12345, text="Привет")

        assert result is True
        assert bot.send_message.await_count == 2

    @pytest.mark.asyncio
    async def test_429_max_retries_exceeded(self):
        """При превышении лимита повторов на 429 возвращаем False."""
        bot = MagicMock()
        bot.send_message = AsyncMock(
            side_effect=FakeTelegramError("Too Many Requests", retry_after=0)
        )

        result = await send_with_retry(bot, 12345, text="Привет")

        assert result is False
        assert bot.send_message.await_count == MAX_SEND_RETRIES

    @pytest.mark.asyncio
    async def test_permanent_error_returns_false(self):
        """При постоянной ошибке (не 429) возвращаем False сразу."""
        bot = MagicMock()
        bot.send_message = AsyncMock(side_effect=Exception("Network error"))

        result = await send_with_retry(bot, 12345, text="Привет")

        assert result is False
        assert bot.send_message.await_count == 1

    @pytest.mark.asyncio
    async def test_retry_after_zero_completes_quickly(self):
        """retry_after=0 — повтор должен пройти мгновенно без задержек."""
        bot = MagicMock()
        bot.send_message = AsyncMock(
            side_effect=[
                FakeTelegramError("Too Many Requests", retry_after=0),
                None,
            ]
        )

        result = await asyncio.wait_for(
            send_with_retry(bot, 12345, text="Привет"), timeout=1.0
        )

        assert result is True
        assert bot.send_message.await_count == 2

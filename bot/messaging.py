"""Отправка сообщений с повторами при Telegram 429 / retry_after."""

import asyncio

from aiogram.types import BufferedInputFile, InlineKeyboardMarkup

from config import MAX_SEND_RETRIES, SEND_SEMAPHORE_LIMIT, logger

SEND_SEMAPHORE = asyncio.Semaphore(SEND_SEMAPHORE_LIMIT)


async def send_with_retry(
    bot,
    chat_id: int | str,
    *,
    text: str | None = None,
    photo: BufferedInputFile | None = None,
    caption: str | None = None,
    reply_markup: InlineKeyboardMarkup | None = None,
    parse_mode: str | None = None,
) -> bool:
    """Send a message with retry on Telegram 429 / retry_after."""
    if photo is None and text is None:
        logger.warning("Send to %s: no text or photo provided", chat_id)
        return False

    for attempt in range(MAX_SEND_RETRIES):
        try:
            if photo is not None:
                await bot.send_photo(
                    chat_id=chat_id,
                    photo=photo,
                    caption=caption,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode,
                )
            elif text is not None:
                await bot.send_message(
                    chat_id=chat_id,
                    text=text,
                    reply_markup=reply_markup,
                    parse_mode=parse_mode,
                )
            else:
                return False
            return True
        except Exception as exc:  # noqa: BLE001
            # aiogram raises TelegramAPIError with .retry_after on 429
            retry_after = getattr(exc, "retry_after", None)
            if retry_after is not None and attempt < MAX_SEND_RETRIES - 1:
                logger.warning(
                    "Send to %s rate-limited, retry_after=%s, attempt=%s",
                    chat_id,
                    retry_after,
                    attempt + 1,
                )
                await asyncio.sleep(retry_after)
                continue
            logger.warning("Send to %s failed: %s", chat_id, exc)
            return False
    return False

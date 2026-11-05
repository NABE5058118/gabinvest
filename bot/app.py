"""Точка входа бота: экземпляр бота, диспетчер, запуск polling."""

import asyncio

from aiogram import Bot, Dispatcher, Router
from aiohttp import ClientSession

from backend_client import BackendClient
from bot_http import close_first_touch_session, close_http_session
from config import BACKEND_URL, BOT_SYNC_SECRET, BOT_TOKEN, logger

assert BOT_TOKEN is not None, "BOT_TOKEN must be set"

bot_instance = Bot(token=BOT_TOKEN)
dp = Dispatcher()
router = Router()
backend = BackendClient(BACKEND_URL, bot_sync_secret=BOT_SYNC_SECRET or None)

# Единый объект Bot — нужен и для polling, и для отправки уведомлений из вебхука.

_first_touch_session: ClientSession | None = None

dp.include_router(router)


async def run_bot():
    from web import start_web_server

    runner = await start_web_server()
    try:
        await bot_instance.delete_webhook(drop_pending_updates=False)
        logger.info("Bot polling started")
        await dp.start_polling(bot_instance)
    except asyncio.CancelledError:
        raise
    except Exception:  # noqa: BLE001
        logger.exception("Polling failed")
        retry_delay = 5
        max_retry = 60
        while True:
            try:
                await bot_instance.delete_webhook(drop_pending_updates=False)
                logger.info("Bot polling resumed")
                await dp.start_polling(bot_instance)
                return
            except asyncio.CancelledError:
                raise
            except Exception:  # noqa: BLE001
                logger.exception("Polling retry failed")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_retry)
    finally:
        await runner.cleanup()
        await backend.close()
        await close_http_session()
        await close_first_touch_session()
        await bot_instance.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logger.info("Bot stopped")

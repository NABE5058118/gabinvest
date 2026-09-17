import os, asyncio, logging, sys
from aiogram import Bot, Dispatcher, types, Router
from aiogram.types import WebAppInfo
from aiogram.client.session.aiohttp import AiohttpSession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gabinvest.cloud-ip.cc')
PROXY_URL = os.getenv('PROXY_URL')

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set. Add TELEGRAM_BOT_TOKEN to .env")

if PROXY_URL:
    logging.info(f"Using proxy: {PROXY_URL}")

dp = Dispatcher()
router = Router()
dp.include_router(router)


@router.message(lambda msg: msg.text == '/start')
async def start(message: types.Message):
    await message.answer(
        'Добро пожаловать в GAB Invest — маркетплейс коммерческой недвижимости.',
        reply_markup=types.InlineKeyboardMarkup(
            inline_keyboard=[[
                types.InlineKeyboardButton(
                    text='Открыть каталог',
                    web_app=WebAppInfo(url=WEB_APP_URL)
                )
            ]]
        )
    )


async def proxy_keepalive(bot: Bot, interval_seconds: int = 300):
    while True:
        try:
            await asyncio.sleep(interval_seconds)
            await bot.get_me()
            logging.debug("Proxy keepalive sent")
        except asyncio.CancelledError:
            raise
        except Exception:
            logging.exception("Proxy keepalive failed")


async def run_bot():
    retry_delay = 5
    max_retry_delay = 60

    while True:
        try:
            session = AiohttpSession(proxy=PROXY_URL) if PROXY_URL else None
            bot = Bot(token=BOT_TOKEN, session=session)
            keepalive_task = asyncio.create_task(proxy_keepalive(bot))
            await bot.delete_webhook(drop_pending_updates=True)
            logging.info("Webhook deleted, starting polling")
            await dp.start_polling(bot)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logging.exception(f"Bot polling failed: {e}")
            logging.info(f"Retrying in {retry_delay}s...")
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, max_retry_delay)
        finally:
            if 'keepalive_task' in locals():
                keepalive_task.cancel()
                try:
                    await keepalive_task
                except asyncio.CancelledError:
                    pass
            if 'session' in locals() and session is not None:
                await session.close()


if __name__ == '__main__':
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logging.info("Bot stopped")

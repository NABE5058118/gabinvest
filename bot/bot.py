import os
import asyncio
import logging
import sys
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
    raise RuntimeError(
        "BOT_TOKEN is not set. Add it to .env file: "
        "TELEGRAM_BOT_TOKEN=..."
    )

session = AiohttpSession(proxy=PROXY_URL) if PROXY_URL else None
if PROXY_URL:
    logging.info(f"Using proxy: {PROXY_URL}")

bot = Bot(token=BOT_TOKEN, session=session)
dp = Dispatcher()
router = Router()
dp.include_router(router)


@router.message(lambda msg: msg.text == '/start')
async def start(message: types.Message):
    await message.answer(
        'Добро пожаловать в GAB Invest — маркетплейс коммерческой недвижимости.',
        reply_markup=types.InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    types.InlineKeyboardButton(
                        text='Открыть каталог',
                        web_app=WebAppInfo(url=WEB_APP_URL)
                    )
                ]
            ]
        )
    )


async def main():
    await bot.delete_webhook(drop_pending_updates=True)
    logging.info("Webhook deleted, starting polling")
    await dp.start_polling(bot)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        logging.exception(f"Bot error: {e}")
        raise
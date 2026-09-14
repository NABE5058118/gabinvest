import os
import asyncio
from aiogram import Bot, Dispatcher, types, Router
from aiogram.types import WebAppInfo
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application
from aiohttp import web
import aiohttp

BOT_TOKEN = os.getenv('BOT_TOKEN', '8698660505:AAEZWaIuQXoiS343M_nQ4URbj9GXjZjdya4')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gab-invest.ru')
WEBHOOK_PATH = os.getenv('WEBHOOK_PATH', '/webhook/telegram')
WEBHOOK_HOST = os.getenv('WEBHOOK_HOST', 'gabinvest.cloud-ip.cc')
WEBHOOK_PORT = int(os.getenv('WEBHOOK_PORT', '8080'))
BASE_URL = f"https://{WEBHOOK_HOST}"

bot = Bot(token=BOT_TOKEN)
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
    webhook_url = f"{BASE_URL}{WEBHOOK_PATH}"
    await bot.set_webhook(webhook_url)
    print(f"Webhook set to {webhook_url}")

    app = web.Application()
    handler = SimpleRequestHandler(dispatcher=dp, bot=bot)
    handler.register(app, path=WEBHOOK_PATH)
    setup_application(app, dp, bot=bot)

    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', WEBHOOK_PORT)
    await site.start()
    print(f"Bot webhook server started on port {WEBHOOK_PORT}")

    while True:
        await asyncio.sleep(3600)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"Bot error: {e}")
        raise

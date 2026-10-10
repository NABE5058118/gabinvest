"""GAB Invest Telegram Bot — deals, attribution, commissions."""
import os, asyncio, logging, sys, re, hashlib
from aiogram import Bot, Dispatcher, types, Router, F
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiohttp import ClientSession

from backend_client import BackendClient
from anti_bypass import is_allowed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s", stream=sys.stdout)

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gabinvest.cloud-ip.cc')
BACKEND_URL = os.getenv('BACKEND_URL', 'https://gabinvest.cloud-ip.cc')
ADMIN_TELEGRAM_IDS = os.getenv('ADMIN_TELEGRAM_IDS', '')

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set")

dp = Dispatcher()
router = Router()
dp.include_router(router)
backend = BackendClient(BACKEND_URL)

DEAL_STAGES = ['offer', 'counter_offer', 'deposit', 'verification', 'contract', 'registration', 'closed']

def parse_deep_link(text: str | None) -> dict:
    if not text:
        return {'source': 'direct', 'campaign': None, 'referrer': None}
    parts = text.split()
    if len(parts) < 2:
        return {'source': 'direct', 'campaign': None, 'referrer': None}
    payload = parts[1]
    if payload.startswith('start_') or payload.startswith('ref_'):
        return {'source': 'deep_link', 'campaign': payload, 'referrer': None}
    if payload.startswith('utm_'):
        return {'source': 'utm', 'campaign': payload, 'referrer': None}
    return {'source': 'direct', 'campaign': payload, 'referrer': None}

async def record_first_touch(message: types.Message):
    tg_user = message.from_user
    touch = parse_deep_link(message.text)
    data = {
        'telegramId': str(tg_user.id),
        'firstName': tg_user.first_name or '',
        'lastName': tg_user.last_name or '',
        'username': tg_user.username or '',
        'source': touch['source'],
        'campaign': touch['campaign'],
        'referrer': touch['referrer'],
    }
    try:
        async with ClientSession() as session:
            async with session.post(f"{BACKEND_URL.rstrip('/')}/api/attribution/first-touch", json=data, timeout=5) as resp:
                if resp.status == 200:
                    logging.info("First touch recorded for %s", tg_user.id)
    except Exception as exc:
        logging.warning("First touch failed: %s", exc)

@router.message(Command('start'))
async def start(message: types.Message):
    await record_first_touch(message)
    tg_user = message.from_user
    await backend.sync_user(tg_user)
    await message.answer(
        'Добро пожаловать в GAB Invest — маркетплейс коммерческой недвижимости.',
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text='Открыть каталог', web_app=WebAppInfo(url=WEB_APP_URL))
        ]])
    )

@router.message(Command('admin'))
async def admin(message: types.Message):
    if not ADMIN_TELEGRAM_IDS:
        return
    try:
        allowed = [int(p.strip()) for p in ADMIN_TELEGRAM_IDS.split(',') if p.strip()]
    except ValueError:
        return
    if message.from_user.id not in allowed:
        return
    await message.answer(
        'Панель администратора',
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
            InlineKeyboardButton(text='Открыть админ панель', web_app=WebAppInfo(url=f"{WEB_APP_URL.rstrip('/')}/admin"))
        ]])
    )

@router.message(F.text)
async def handle_message(message: types.Message):
    if not is_allowed(message.text or ''):
        await message.delete()
        return
    await message.answer('Сообщение отправлено. Сделки проходят через маркетплейс.')

async def run_bot():
    retry_delay = 5
    max_retry = 60
    while True:
        try:
            bot = Bot(token=BOT_TOKEN)
            await bot.delete_webhook(drop_pending_updates=True)
            logging.info("Bot polling started")
            await dp.start_polling(bot)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logging.exception("Polling failed: %s", e)
            await asyncio.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, max_retry)
        finally:
            if 'bot' in locals():
                await bot.session.close()

if __name__ == '__main__':
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logging.info("Bot stopped")
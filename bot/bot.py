import os, asyncio, logging, sys
from aiogram import Bot, Dispatcher, types, Router
from aiogram.types import WebAppInfo
from aiohttp import ClientSession

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stdout,
)

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gabinvest.cloud-ip.cc')
BACKEND_URL = os.getenv('BACKEND_URL', 'https://gabinvest.cloud-ip.cc')
ADMIN_TELEGRAM_IDS = os.getenv('ADMIN_TELEGRAM_IDS', '')

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set. Add TELEGRAM_BOT_TOKEN to .env")

dp = Dispatcher()
router = Router()
dp.include_router(router)


async def sync_user_to_backend(tg_user: types.User) -> None:
    if not BACKEND_URL:
        return

    url = f"{BACKEND_URL.rstrip('/')}/api/auth/telegram/bot-sync"
    payload = {
        'telegramId': tg_user.id,
        'firstName': tg_user.first_name or '',
        'lastName': tg_user.last_name or '',
        'username': tg_user.username or '',
        'languageCode': tg_user.language_code or '',
        'isPremium': getattr(tg_user, 'is_premium', False),
        'allowsWriteToPm': getattr(tg_user, 'allows_write_to_pm', False),
    }

    try:
        async with ClientSession() as session:
            async with session.post(url, json=payload, timeout=5) as resp:
                if resp.status == 200:
                    logging.info("Synced user %s to backend", tg_user.id)
                else:
                    text = await resp.text()
                    logging.warning("Backend sync failed %s: %s", resp.status, text)
    except Exception as exc:
        logging.warning("Backend sync error: %s", exc)


@router.message(lambda msg: msg.text == '/admin')
async def admin(message: types.Message):
    if not ADMIN_TELEGRAM_IDS:
        return

    try:
        allowed_ids = [int(part.strip()) for part in ADMIN_TELEGRAM_IDS.split(',') if part.strip()]
    except ValueError:
        return

    if message.from_user.id not in allowed_ids:
        return

    if not WEB_APP_URL:
        return

    await message.answer(
        'Панель администратора',
        reply_markup=types.InlineKeyboardMarkup(
            inline_keyboard=[[
                types.InlineKeyboardButton(
                    text='Открыть админ панель',
                    url=f"{WEB_APP_URL.rstrip('/')}/admin-login"
                )
            ]]
        )
    )


@router.message(lambda msg: msg.text == '/start')
async def start(message: types.Message):
    await sync_user_to_backend(message.from_user)

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


async def run_bot():
    retry_delay = 5
    max_retry_delay = 60

    while True:
        try:
            bot = Bot(token=BOT_TOKEN)
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
            if 'bot' in locals():
                await bot.session.close()


if __name__ == '__main__':
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logging.info("Bot stopped")

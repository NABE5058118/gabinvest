"""GAB Invest Telegram Bot — deals, attribution, commissions."""
import os, asyncio, logging, sys, re, hashlib, hmac
from aiogram import Bot, Dispatcher, types, Router, F
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command
from aiohttp import ClientSession, web

from backend_client import BackendClient
from anti_bypass import is_allowed

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s", stream=sys.stdout)

BOT_TOKEN = os.getenv('BOT_TOKEN')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gabinvest.cloud-ip.cc')
BACKEND_URL = os.getenv('BACKEND_URL', 'https://gabinvest.cloud-ip.cc')
ADMIN_TELEGRAM_IDS = os.getenv('ADMIN_TELEGRAM_IDS', '')
BOT_SYNC_SECRET = os.getenv('BOT_SYNC_SECRET', '')

if not BOT_TOKEN:
    raise RuntimeError("BOT_TOKEN is not set")
if not BOT_SYNC_SECRET:
    raise RuntimeError("BOT_SYNC_SECRET is not set")

dp = Dispatcher()
router = Router()
dp.include_router(router)
backend = BackendClient(BACKEND_URL, bot_sync_secret=BOT_SYNC_SECRET or None)

# Единый объект Bot — нужен и для polling, и для отправки уведомлений из вебхука.
bot_instance = Bot(token=BOT_TOKEN)

# ---- Вебхук от бэкенда: новая заявка -> уведомить админов ----
async def handle_lead_notify(request: web.Request) -> web.Response:
    supplied = request.headers.get('x-bot-sync-secret', '')
    if not BOT_SYNC_SECRET or not supplied or not hmac.compare_digest(supplied, BOT_SYNC_SECRET):
        return web.json_response({'error': 'Unauthorized'}, status=401)
    try:
        data = await request.json()
    except Exception:
        return web.json_response({'error': 'invalid json'}, status=400)

    text = data.get('text')
    if not text:
        return web.json_response({'error': 'text is required'}, status=400)

    admin_ids = [int(p.strip()) for p in ADMIN_TELEGRAM_IDS.split(',') if p.strip()]
    results = []
    for admin_id in admin_ids:
        try:
            await bot_instance.send_message(chat_id=admin_id, text=text, parse_mode='HTML')
            results.append({'admin': admin_id, 'ok': True})
        except Exception as exc:
            logging.warning('Lead-notify: failed to notify admin %s: %s', admin_id, exc)
            results.append({'admin': admin_id, 'ok': False, 'error': str(exc)})

    notified = sum(1 for r in results if r['ok'])
    logging.info('Lead-notify done: notified=%s of %s', notified, len(admin_ids))
    return web.json_response({'ok': True, 'notified': notified, 'results': results})


# ---- Вебхук от бэкенда: новый объект -> рассылка подписчикам ----
async def handle_object_notify(request: web.Request) -> web.Response:
    supplied = request.headers.get('x-bot-sync-secret', '')
    if not BOT_SYNC_SECRET or not supplied or not hmac.compare_digest(supplied, BOT_SYNC_SECRET):
        return web.json_response({'error': 'Unauthorized'}, status=401)
    try:
        data = await request.json()
    except Exception as exc:
        logging.warning('Object-notify: invalid json from %s: %s', request.remote, exc)
        return web.json_response({'error': 'invalid json'}, status=400)

    object_id = data.get('objectId')
    logging.info('Object-notify: received webhook from %s with data=%s', request.remote, data)
    if not object_id:
        logging.warning('Object-notify: missing objectId from %s', request.remote)
        return web.json_response({'error': 'objectId is required'}, status=400)

    # Запросить список подписанных пользователей у бэкенда
    subscribers = await backend.get_subscribers(object_id)
    logging.info('Object-notify: fetched subscribers count=%s for objectId=%s', len(subscribers), object_id)
    if not subscribers:
        return web.json_response({'ok': True, 'notified': 0, 'message': 'No subscribers'})
    
    logging.info('Object-notify: subscribers data=%s', subscribers)

    # Формируем текст уведомления
    title = data.get('title', 'Новый объект')
    location = data.get('location', '')
    price = data.get('price', 0)
    price_indicator = data.get('priceIndicator', '')
    image = data.get('image', '') or None

    # Если картинка не пришла в вебхуке, попробуем получить её из бэкенда
    if not image:
        try:
            obj_data = await backend.get(f'/api/admin/objects/{object_id}')
            if isinstance(obj_data, dict):
                if obj_data.get('image'):
                    image = obj_data.get('image')
                elif obj_data.get('images') and isinstance(obj_data.get('images'), list) and len(obj_data['images']) > 0:
                    first_img = obj_data['images'][0]
                    if isinstance(first_img, dict):
                        image = first_img.get('url') or first_img.get('image')
                    elif isinstance(first_img, str):
                        image = first_img
            logging.info('Object-notify: fetched object from backend, image=%s', image)
        except Exception as exc:
            logging.warning('Object-notify: failed to fetch object details: %s', exc)

    price_label = f"{int(price):,}".replace(',', ' ') + ' ₽' if price else ''
    indicator_label = {'below_market': 'ниже рынка', 'market': 'по рынку', 'above_market': 'выше рынка'}.get(price_indicator, price_indicator)

    text = f"<b>🆕 Новый объект на продажу!</b>\n\n<b>{title}</b>\n📍 {location}\n💰 {price_label}"
    if indicator_label:
        text += f" ({indicator_label})"

    link = f"{WEB_APP_URL.rstrip('/')}/?startapp=object_{object_id}"

    notified = 0
    failed = 0
    for sub in subscribers:
        tg_id = sub.get('telegramId')
        if not tg_id:
            logging.warning('Object-notify: subscriber missing telegramId: %s', sub)
            continue
        try:
            logging.info('Object-notify: trying to send to %s for objectId=%s', tg_id, object_id)
            photo_url = None
            if image:
                img_str = str(image).strip()
                if img_str.startswith('http://') or img_str.startswith('https://'):
                    photo_url = img_str
                elif img_str.startswith('/'):
                    photo_url = f"{BACKEND_URL.rstrip('/')}{img_str}"
                elif img_str:
                    photo_url = f"{BACKEND_URL.rstrip('/')}/uploads/{img_str}"
                logging.info('Object-notify: photo_url for %s = %s', tg_id, photo_url)

            if photo_url:
                try:
                    await bot_instance.send_photo(
                        chat_id=int(tg_id),
                        photo=photo_url,
                        caption=text,
                        parse_mode='HTML',
                        reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                            InlineKeyboardButton(text='Смотреть в каталоге', url=link)
                        ]])
                    )
                    notified += 1
                    logging.info('Object-notify: successfully sent photo to %s', tg_id)
                    continue
                except Exception as exc:
                    logging.warning('Object-notify: send_photo failed for %s, fallback to text: %s', tg_id, exc)

            await bot_instance.send_message(
                chat_id=int(tg_id),
                text=text,
                parse_mode='HTML',
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[[
                    InlineKeyboardButton(text='Смотреть в каталоге', url=link)
                ]])
            )
            notified += 1
            logging.info('Object-notify: successfully sent to %s', tg_id)
        except Exception as exc:
            logging.exception('Object-notify: EXCEPTION sending to %s: %s', tg_id, exc)
            failed += 1
    
    logging.info('Object-notify done: notified=%s failed=%s for objectId=%s', notified, failed, object_id)
    return web.json_response({'ok': True, 'notified': notified, 'failed': failed})


# ---- Вебхук от бэкенда: смена статуса заявки -> уведомить клиента ----
async def handle_status_notify(request: web.Request) -> web.Response:
    supplied = request.headers.get('x-bot-sync-secret', '')
    if not BOT_SYNC_SECRET or not supplied or not hmac.compare_digest(supplied, BOT_SYNC_SECRET):
        return web.json_response({'error': 'Unauthorized'}, status=401)
    try:
        data = await request.json()
    except Exception:
        return web.json_response({'error': 'invalid json'}, status=400)

    client_tg_id = data.get('clientTelegramId')
    text = data.get('text')
    if not client_tg_id or not text:
        return web.json_response({'error': 'clientTelegramId and text are required'}, status=400)

    try:
        await bot_instance.send_message(chat_id=int(client_tg_id), text=text, parse_mode='HTML')
        logging.info('Status-notify sent to client %s', client_tg_id)
        return web.json_response({'ok': True, 'client': client_tg_id})
    except Exception as exc:
        logging.warning('Status-notify: failed to notify client %s: %s', client_tg_id, exc)
        return web.json_response({'ok': False, 'error': str(exc)}, status=500)


def build_web_app() -> web.Application:
    app = web.Application()
    app.router.add_post('/webhook/lead-notify', handle_lead_notify)
    app.router.add_post('/webhook/notify-status', handle_status_notify)
    app.router.add_post('/webhook/object-notify', handle_object_notify)
    return app


async def start_web_server() -> web.AppRunner:
    runner = web.AppRunner(build_web_app())
    await runner.setup()
    site = web.TCPSite(runner, host='0.0.0.0', port=8080)
    await site.start()
    logging.info("Lead-notify webhook listening on :8080 (/webhook/lead-notify)")
    return runner

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

_first_touch_session: ClientSession | None = None

def get_first_touch_session() -> ClientSession:
    """Lazily create one reusable session for attribution calls."""
    global _first_touch_session
    if _first_touch_session is None or _first_touch_session.closed:
        _first_touch_session = ClientSession()
    return _first_touch_session

async def record_first_touch(message: types.Message):
    session = get_first_touch_session()
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
    # Автоподписка на уведомления о новых объектах (опт-ин по умолчанию)
    try:
        await backend.toggle_notify(tg_user.id)
    except Exception as exc:
        logging.warning('Auto-subscribe failed: %s', exc)
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
    runner = await start_web_server()
    try:
        await bot_instance.delete_webhook(drop_pending_updates=False)
        logging.info("Bot polling started")
        await dp.start_polling(bot_instance)
    except asyncio.CancelledError:
        raise
    except Exception as e:
        logging.exception("Polling failed: %s", e)
        retry_delay = 5
        max_retry = 60
        while True:
            try:
                await bot_instance.delete_webhook(drop_pending_updates=False)
                logging.info("Bot polling resumed")
                await dp.start_polling(bot_instance)
                return
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logging.exception("Polling retry failed: %s", exc)
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, max_retry)
    finally:
        await runner.cleanup()
        await backend.close()
        if _first_touch_session is not None and not _first_touch_session.closed:
            await _first_touch_session.close()
        await bot_instance.session.close()

if __name__ == '__main__':
    try:
        asyncio.run(run_bot())
    except KeyboardInterrupt:
        logging.info("Bot stopped")
"""Вебхук-обработчики от бэкенда: лиды, новые объекты, смена статуса заявки."""

import asyncio
import logging

from aiogram.types import BufferedInputFile, InlineKeyboardButton, InlineKeyboardMarkup
from aiohttp import web

from app import backend, bot_instance
from bot_http import download_image
from config import (
    ADMIN_TELEGRAM_IDS,
    BACKEND_URL,
    BOT_SYNC_SECRET,
    WEB_APP_URL,
)
from messaging import SEND_SEMAPHORE, send_with_retry

logger = logging.getLogger(__name__)


async def handle_lead_notify(request: web.Request) -> web.Response:
    """Вебхук от бэкенда: новая заявка -> уведомить админов."""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"error": "invalid json"}, status=400)

    text = data.get("text")
    if not text:
        return web.json_response({"error": "text is required"}, status=400)

    admin_ids = [int(p.strip()) for p in ADMIN_TELEGRAM_IDS.split(",") if p.strip()]
    results: list = []
    for admin_id in admin_ids:
        try:
            await bot_instance.send_message(
                chat_id=admin_id, text=text, parse_mode="HTML"
            )
            results.append({"admin": admin_id, "ok": True})
        except Exception as exc:  # noqa: BLE001
            logger.warning("Lead-notify: failed to notify admin %s: %s", admin_id, exc)
            results.append({"admin": admin_id, "ok": False, "error": str(exc)})

    notified = sum(1 for r in results if r["ok"])
    logger.info("Lead-notify done: notified=%s of %s", notified, len(admin_ids))
    return web.json_response({"ok": True, "notified": notified, "results": results})


async def handle_object_notify(request: web.Request) -> web.Response:
    """Вебхук от бэкенда: новый объект -> рассылка подписчикам."""
    try:
        data = await request.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Object-notify: invalid json from %s: %s", request.remote, exc)
        return web.json_response({"error": "invalid json"}, status=400)

    object_id = data.get("objectId")
    logger.info(
        "Object-notify: received webhook from %s with data=%s",
        request.remote,
        data,
    )
    if not object_id:
        logger.warning("Object-notify: missing objectId from %s", request.remote)
        return web.json_response({"error": "objectId is required"}, status=400)

    # Запросить список подписанных пользователей у бэкенда
    subscribers = await backend.get_subscribers(object_id)
    logger.info(
        "Object-notify: fetched subscribers count=%s for objectId=%s",
        len(subscribers),
        object_id,
    )
    if not subscribers:
        return web.json_response(
            {"ok": True, "notified": 0, "message": "No subscribers"}
        )

    logger.info("Object-notify: subscribers data=%s", subscribers)

    # Формируем текст уведомления
    title = data.get("title", "Новый объект")
    location = data.get("location", "")
    price = data.get("price", 0)
    price_indicator = data.get("priceIndicator", "")
    image = data.get("image", "") or None

    # Если картинка не пришла в вебхуке, попробуем получить её из бэкенда
    if not image:
        try:
            headers = {}
            if BOT_SYNC_SECRET:
                headers["x-bot-sync-secret"] = BOT_SYNC_SECRET
            obj_data = await backend.get(
                f"/api/admin/objects/{object_id}", headers=headers
            )
            if isinstance(obj_data, dict):
                if obj_data.get("image"):
                    image = obj_data.get("image")
                elif (
                    obj_data.get("images")
                    and isinstance(obj_data.get("images"), list)
                    and len(obj_data["images"]) > 0
                ):
                    first_img = obj_data["images"][0]
                    if isinstance(first_img, dict):
                        image = (
                            first_img.get("url")
                            or first_img.get("image")
                            or first_img.get("src")
                        )
                    elif isinstance(first_img, str):
                        image = first_img
                logger.info(
                    "Object-notify: fetched object from backend, image=%s", image
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Object-notify: failed to fetch object details: %s", exc)

    price_label = f"{int(price):,}".replace(",", " ") + " ₽" if price else ""
    indicator_label = {
        "below_market": "ниже рынка",
        "market": "по рынку",
        "above_market": "выше рынка",
    }.get(price_indicator, price_indicator)

    text = "🏢 Новый объект на продажу!\n\n"
    text += f"Объект: {title}\nЛокация: {location}\nЦена: {price_label}"
    if indicator_label:
        text += f" ({indicator_label})"
    text += "\n\nОтписаться от уведомлений: /unsubscribe"

    link = f"{WEB_APP_URL.rstrip('/')}/?startapp=object_{object_id}"

    async def send_one(sub: dict) -> bool:
        tg_id = sub.get("telegramId")
        if not tg_id:
            logger.warning("Object-notify: subscriber missing telegramId: %s", sub)
            return False

        async with SEND_SEMAPHORE:
            photo_url = None
            if image:
                img_str = str(image).strip()
                if img_str.startswith(("http://", "https://")):
                    photo_url = img_str
                elif img_str.startswith("/"):
                    photo_url = f"{BACKEND_URL.rstrip('/')}{img_str}"
                elif img_str:
                    photo_url = f"{BACKEND_URL.rstrip('/')}/uploads/{img_str}"

            if photo_url:
                img_bytes = await download_image(photo_url, timeout=10)
                if img_bytes:
                    ok = await send_with_retry(
                        bot=bot_instance,
                        chat_id=int(tg_id),
                        photo=BufferedInputFile(img_bytes, filename="photo.jpg"),
                        caption=text,
                        reply_markup=InlineKeyboardMarkup(
                            inline_keyboard=[
                                [
                                    InlineKeyboardButton(
                                        text="Смотреть в каталоге", url=link
                                    )
                                ]
                            ]
                        ),
                    )
                    if ok:
                        logger.info(
                            "Object-notify: successfully sent photo to %s", tg_id
                        )
                        return True
                    logger.warning(
                        "Object-notify: send_photo failed for %s, fallback to text",
                        tg_id,
                    )

            ok = await send_with_retry(
                bot=bot_instance,
                chat_id=int(tg_id),
                text=text,
                reply_markup=InlineKeyboardMarkup(
                    inline_keyboard=[
                        [InlineKeyboardButton(text="Смотреть в каталоге", url=link)]
                    ]
                ),
            )
            if ok:
                logger.info("Object-notify: successfully sent to %s", tg_id)
            return ok

    results = await asyncio.gather(*(send_one(sub) for sub in subscribers))
    notified = sum(1 for ok in results if ok)
    failed = len(results) - notified

    logger.info(
        "Object-notify done: notified=%s failed=%s for objectId=%s",
        notified,
        failed,
        object_id,
    )
    return web.json_response({"ok": True, "notified": notified, "failed": failed})


async def handle_status_notify(request: web.Request) -> web.Response:
    """Вебхук от бэкенда: смена статуса заявки -> уведомить клиента."""
    try:
        data = await request.json()
    except Exception:  # noqa: BLE001
        return web.json_response({"error": "invalid json"}, status=400)

    client_tg_id = data.get("clientTelegramId")
    text = data.get("text")
    if not client_tg_id or not text:
        return web.json_response(
            {"error": "clientTelegramId and text are required"}, status=400
        )

    try:
        await bot_instance.send_message(
            chat_id=int(client_tg_id), text=text, parse_mode="HTML"
        )
        logger.info("Status-notify sent to client %s", client_tg_id)
        return web.json_response({"ok": True, "client": client_tg_id})
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Status-notify: failed to notify client %s: %s", client_tg_id, exc
        )
        return web.json_response({"ok": False, "error": str(exc)}, status=500)

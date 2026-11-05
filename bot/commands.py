"""Обработчики команд и сообщений бота."""

import logging

from aiogram import F, types
from aiogram.filters import Command
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    WebAppInfo,
)

from bot_http import get_first_touch_session
from config import ADMIN_TELEGRAM_IDS, WEB_APP_URL

logger = logging.getLogger(__name__)

DEAL_STAGES = [
    "offer",
    "counter_offer",
    "deposit",
    "verification",
    "contract",
    "registration",
    "closed",
]


def parse_deep_link(text: str | None) -> dict:
    if not text:
        return {"source": "direct", "campaign": None, "referrer": None}
    parts = text.split()
    if len(parts) < 2:
        return {"source": "direct", "campaign": None, "referrer": None}
    payload = parts[1]
    if payload.startswith(("start_", "ref_")):
        return {"source": "deep_link", "campaign": payload, "referrer": None}
    if payload.startswith("utm_"):
        return {"source": "utm", "campaign": payload, "referrer": None}
    return {"source": "direct", "campaign": payload, "referrer": None}


def setup(router, backend) -> None:
    """Зарегистрировать все обработчики команд на роутере."""

    async def record_first_touch(message: types.Message):
        tg_user = message.from_user
        if tg_user is None:
            return
        session = get_first_touch_session()
        touch = parse_deep_link(message.text)
        data = {
            "telegramId": str(tg_user.id),
            "firstName": tg_user.first_name or "",
            "lastName": tg_user.last_name or "",
            "username": tg_user.username or "",
            "source": touch["source"],
            "campaign": touch["campaign"],
            "referrer": touch["referrer"],
        }
        try:
            import aiohttp

            async with session.post(
                f"{backend.base_url.rstrip('/')}/api/attribution/first-touch",
                json=data,
                timeout=aiohttp.ClientTimeout(total=5),
            ) as resp:
                if resp.status == 200:
                    logger.info("First touch recorded for %s", tg_user.id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("First touch failed: %s", exc)

    @router.message(Command("start"))
    async def start(message: types.Message):
        await record_first_touch(message)
        tg_user = message.from_user
        if tg_user is None:
            return
        await backend.sync_user(tg_user)

        # Спрашиваем о подписке на новые объекты (opt-in, без автоподписки).
        keyboard = InlineKeyboardMarkup(
            inline_keyboard=[
                [
                    InlineKeyboardButton(
                        text="Открыть каталог",
                        web_app=WebAppInfo(url=WEB_APP_URL),
                    )
                ],
                [
                    InlineKeyboardButton(
                        text="Подписаться на новые объекты",
                        callback_data="notify_subscribe",
                    )
                ],
            ]
        )
        await message.answer(
            "Добро пожаловать в GAB Invest — маркетплейс коммерческой недвижимости.",
            reply_markup=keyboard,
        )

    @router.message(Command("admin"))
    async def admin(message: types.Message):
        if not ADMIN_TELEGRAM_IDS:
            return
        tg_user = message.from_user
        if tg_user is None:
            return
        try:
            allowed = [
                int(p.strip()) for p in ADMIN_TELEGRAM_IDS.split(",") if p.strip()
            ]
        except ValueError:
            return
        if tg_user.id not in allowed:
            return
        await message.answer(
            "Панель администратора",
            reply_markup=InlineKeyboardMarkup(
                inline_keyboard=[
                    [
                        InlineKeyboardButton(
                            text="Открыть админ панель",
                            web_app=WebAppInfo(url=f"{WEB_APP_URL.rstrip('/')}/admin"),
                        )
                    ]
                ]
            ),
        )

    @router.message(Command("link"))
    async def link_command(message: types.Message):
        """Привязать Telegram-аккаунт к веб-аккаунту через код."""
        parts = (message.text or "").split()
        if len(parts) < 2:
            await message.answer(
                "Использование: /link <код>\n"
                "Код можно получить в профиле на сайте в разделе «Привязать Telegram»."
            )
            return
        code = parts[1].strip()
        tg_user = message.from_user
        if tg_user is None:
            await message.answer("Не удалось привязать аккаунт. Попробуйте позже.")
            return
        try:
            result = await backend.link_telegram(code, tg_user.id)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Link-telegram failed: %s", exc)
            await message.answer(
                "Не удалось привязать аккаунт. Попробуйте позже или напишите в поддержку"
            )
            return

        if result.get("_error"):
            status = result.get("_error")
            text = result.get("_text", "")
            if status == 409:
                await message.answer(
                    "Этот Telegram уже привязан к другому аккаунту на сайте.\n"
                    "Если вы считаете, что это ошибка — обратитесь в поддержку: privacy@gab-invest.ru."
                )
            elif status == 400:
                if "истёк" in text:
                    await message.answer("Код истёк. Получите новый код на сайте.")
                elif "уже использован" in text:
                    await message.answer(
                        "Код уже использован. Получите новый код на сайте."
                    )
                else:
                    await message.answer("Неверный код. Проверьте и попробуйте снова.")
            else:
                await message.answer(f"Ошибка при привязке ({status}).")
            return

        if result.get("ok"):
            await message.answer(
                "✅ Telegram аккаунт привязан к вашему профилю на сайте.\n"
                "Теперь вы можете входить в Mini App и на сайт — это один и тот же аккаунт."
            )
        else:
            await message.answer("Не удалось привязать аккаунт. Попробуйте снова.")

    @router.message(Command("help"))
    async def help_command(message: types.Message):
        await message.answer(
            "Доступные команды:\n"
            "/start — запуск бота и открытие каталога\n"
            "/link <код> — привязать Telegram к аккаунту на сайте\n"
            "/subscribe — получать уведомления о новых объектах\n"
            "/unsubscribe — отписаться от уведомлений о новых объектах\n"
            "/help — эта справка\n\n"
        )

    @router.message(Command("subscribe"))
    async def subscribe_command(message: types.Message):
        tg_user = message.from_user
        if tg_user is None:
            await message.answer("Не удалось оформить подписку. Попробуйте позже.")
            return
        try:
            status = await backend.notify_status(tg_user.id)
            already = (
                bool(status.get("subscribed", False))
                if isinstance(status, dict)
                else False
            )
            if already:
                await message.answer(
                    "ℹ️ Вы уже подписаны на уведомления о новых объектах."
                )
                return
            result = await backend.notify_subscribe(tg_user.id)
            subscribed = (
                bool(result.get("subscribed", False))
                if isinstance(result, dict)
                else False
            )
            if subscribed:
                await message.answer("✅ Вы подписаны на уведомления о новых объектах.")
            else:
                await message.answer(
                    "ℹ️ Вы уже были подписаны. При необходимости используйте /unsubscribe."
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Subscribe failed: %s", exc)
            await message.answer("Не удалось оформить подписку. Попробуйте позже.")

    @router.message(Command("unsubscribe"))
    async def unsubscribe_command(message: types.Message):
        tg_user = message.from_user
        if tg_user is None:
            await message.answer("Не удалось отписаться. Попробуйте позже.")
            return
        try:
            status = await backend.notify_status(tg_user.id)
            already = (
                bool(status.get("subscribed", False))
                if isinstance(status, dict)
                else False
            )
            if not already:
                await message.answer(
                    "ℹ️ Вы не были подписаны на уведомления о новых объектах."
                )
                return
            result = await backend.notify_unsubscribe(tg_user.id)
            subscribed = (
                bool(result.get("subscribed", False))
                if isinstance(result, dict)
                else False
            )
            if not subscribed:
                await message.answer("✅ Вы отписаны от уведомлений о новых объектах.")
            else:
                await message.answer("ℹ️ Вы не были подписаны.")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Unsubscribe failed: %s", exc)
            await message.answer("Не удалось отписаться. Попробуйте позже.")

    @router.callback_query(F.data == "notify_subscribe")
    async def notify_subscribe_callback(query: types.CallbackQuery):
        tg_user = query.from_user
        if tg_user is None:
            await query.answer("Не удалось оформить подписку. Попробуйте позже.")
            return
        try:
            status = await backend.notify_status(tg_user.id)
            already = (
                bool(status.get("subscribed", False))
                if isinstance(status, dict)
                else False
            )
            if already:
                await query.answer("ℹ️ Вы уже подписаны")
                if query.message is not None:
                    try:
                        await query.message.edit_reply_markup(reply_markup=None)
                    except Exception:  # noqa: BLE001, S110
                        pass
                return
            result = await backend.notify_subscribe(tg_user.id)
            subscribed = (
                bool(result.get("subscribed", False))
                if isinstance(result, dict)
                else False
            )
            if subscribed:
                await query.answer("✅ Подписка оформлена")
            else:
                await query.answer("ℹ️ Вы уже были подписаны")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Notify subscribe callback failed: %s", exc)
            await query.answer("Не удалось оформить подписку. Попробуйте позже.")
        if query.message is not None:
            try:
                await query.message.edit_reply_markup(reply_markup=None)
            except Exception:  # noqa: BLE001, S110
                pass

    @router.message(F.text)
    async def handle_message(message: types.Message):
        from anti_bypass import is_allowed

        if not is_allowed(message.text or ""):
            await message.delete()
            return
        await message.answer(
            "Я не понимаю это сообщение. Доступные команды:\n"
            "/start — запуск и каталог\n"
            "/link <код> — привязать аккаунт сайта\n"
            "/subscribe — уведомления о новых объектах\n"
            "/unsubscribe — отписаться от уведомлений\n"
            "/help — справка"
        )

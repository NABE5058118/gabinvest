import os
import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import WebAppInfo

BOT_TOKEN = os.getenv('BOT_TOKEN', '8698660505:AAEZWaIuQXoiS343M_nQ4URbj9GXjZjdya4')
WEB_APP_URL = os.getenv('WEB_APP_URL', 'https://gab-invest.ru')

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(lambda msg: msg.text == '/start')
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
    await dp.start_polling(bot)

if __name__ == '__main__':
    print('Bot started')
    asyncio.run(main())

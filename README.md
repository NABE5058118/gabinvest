# GAB Invest — Telegram Mini App

Маркетплейс коммерческой недвижимости для Telegram.

## Стек

- **Frontend:** React 18 + TypeScript + Vite 7 + React Router + CSS Modules
- **Backend:** Node.js + Express + TypeScript + Prisma + Zod
- **Bot:** Aiogram 3.x (Python)
- **База данных:** PostgreSQL 17
- **Контейнеризация:** Docker + docker-compose

## Структура

```
├── backend/          # REST API (Node.js + Express)
├── bot/              # Telegram Bot (Aiogram 3.x)
├── frontend/         # Mini App (React + Vite)
├── nginx/            # Reverse proxy
└── docker-compose.yml
```

## Запуск

1. Установите Docker и Docker Compose
2. Создайте `.env` файл в корне (см. `.env.example`)
3. Запустите: `docker-compose up --build`

## Разработка

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Bot
```bash
cd bot
pip install -e .
python bot.py
```

## Переменные окружения

- `TELEGRAM_BOT_TOKEN` — токен Telegram бота
- `MANAGER_CHAT_ID` — ID чата менеджера для уведомлений
- `WEB_APP_URL` — URL Mini App для кнопки в боте
- `DATABASE_URL` — строка подключения к PostgreSQL

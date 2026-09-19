index-VEppiFoK.js:193  GET https://gabinvest.cloud-ip.cc/api/objects 500 (Internal Server Error)# AGENTS

## Commands

- `docker compose -f docker-compose.prod.yml up -d --build` — поднять продакшен на RF (postgres + backend + frontend)
- `docker compose -f docker-compose.prod.yml ps` — статус контейнеров RF
- `docker compose -f docker-compose.prod.yml logs --tail=50` — логи RF
- `docker compose -f docker-compose.prod.yml down` — остановить стек RF
- `docker compose -f docker-compose.bot.yml up -d --build` — поднять бота на NL
- `docker compose -f docker-compose.bot.yml logs -f` — логи бота на NL
- `cd backend && npm test` — backend тесты
- `cd frontend && npm test` — frontend тесты
- `cd backend && npx prisma migrate deploy` — применить миграции
- `cd backend && npx tsx prisma/seed.ts` — сидирование БД
- `cd backend && npx tsx prisma/seed-admin.ts` — создать админа

## Workflows

- Разработка: локально backend на 3001, frontend на 5173, база локальная PostgreSQL
- Миграции: создаются через `npx prisma migrate dev`, применяются через `migrate deploy`
- Тесты: backend vitest + supertest, frontend vitest + testing-library
- Деплой: git pull → docker compose prod → проверка логов

## Context

- Telegram Mini App marketplace для gab-invest.ru
- Stack: React 18 + TypeScript + Vite, Node.js + Express + Prisma, Aiogram 3.x, PostgreSQL 17, Docker
- Админка: `/admin` с токеном в `x-admin-token` header
- Авторизация: Telegram initData через `/api/auth/telegram`
- Избранное: привязано к telegramId через `/api/favorites`
- Заявки: создаются через `/api/leads`, уведомления в Telegram менеджеру
- Файлы КП: загрузка через multer в `/uploads`, скачивание через `/api/admin/objects/:id/offer/download`
- Бот: aiogram 3.x, polling, WEB_APP_URL указывает на фронтенд, без прокси, развёрнут на отдельном NL-сервере
- Безопасность: fail2ban для SSH и nginx, ufw firewall, только 22/80/443 порты
- Продакшен на двух серверах Selectel:
  - RF: 135.106.210.253 — postgres, backend, frontend (nginx), certbot
  - NL: 163.5.157.243 — bot (aiogram polling)
- Frontend собирается в nginx:alpine, проксирует `/api/` и `/uploads/` на backend
- Backend: node:22-slim, миграции применяются при старте контейнера
- База данных: PostgreSQL 17 в Docker, том `postgres-data`
- Загрузки: том `backend-uploads` для файлов КП
- Переменные окружения: `.env` в корне проекта, `docker-compose.prod.yml` подтягивает их
- Админ токен: `ADMIN_TOKEN` в backend/.env, `VITE_ADMIN_TOKEN` в frontend/.env
- Телеграм токены: `TELEGRAM_BOT_TOKEN`, `MANAGER_CHAT_ID`, `WEB_APP_URL`
- Логи: `docker compose -f docker-compose.prod.yml logs -f`
- SSL: пока не настроен, нужен Certbot + домен

## Current State

- Backend: 15/15 тестов проходят, TypeScript без ошибок
- Frontend: 5/5 тестов проходят, TypeScript без ошибок
- Миграции Prisma созданы: `20260913115613_init`
- Локально всё работает, на сервере есть проблемы с запуском:
  - Backend падает с ошибкой модуля `/app/dist/routes/objects`
  - Frontend падает с `host not found in upstream "backend"`
  - Бот падает с таймаутом к Telegram API
- Нужно доделать деплой на сервер Selectel

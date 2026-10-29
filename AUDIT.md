# Аудит проекта GAB Invest

**Дата:** 29.10.2026  
**Охват:** backend (Express/Prisma), frontend (React/Vite/nginx), bot (aiogram), Docker Compose, миграции, зависимости, конфигурация прод-контура.  
**Метод:** статический анализ кода и конфигурации, read-only проверка прод-контура (TLS, заголовки, CORS, API), `npm audit`, `eslint`, изолированное воспроизведение критического сценария.  
**Ограничения:** backend-тесты локально не запускались (пустой `backend/node_modules`, нужна живая PostgreSQL); полноценный пентест, нагрузочное тестирование и проверка восстановления из бэкапа не выполнялись.

---

## 1. Главное

Проект в целом аккуратный: есть валидация env, zod-схемы, helmet, CORS-allowlist, rate limit, bcrypt, timing-safe сравнения, проверка magic bytes загружаемых файлов, защита от path traversal, non-root backend. Но есть несколько **блокирующих** проблем, которые нужно закрыть до следующего деплоя.

| Приоритет | Проблема | Риск |
|---|---|---|
| **P0** | Неаутентифицированный краш backend на двух admin-маршрутах | DoS всего API |
| **P0** | Миграция `0_init` без baseline | Блокировка/поломка деплоя |
| **P0** | Секрет бота передаётся по HTTP на публичный порт 8080 | Компрометация секрета и админ-данных |
| **P1** | Публичная выдача внутренних полей объекта | Утечка коммерческих данных |
| **P1** | `PUT /api/admin/objects/:id` затирает поля | Потеря данных |
| **P1** | 12 уязвимых зависимостей (2 critical, 8 high) | RCE/DoS/утечки |
| **P1** | Атрибуция, аудит и комиссии доверяют клиенту | Фальсификация финансов и логов |

---

## 2. Критические проблемы (P0)

### P0-1. Неаутентифицированный краш backend

`backend/src/routes/admin.ts:235-242` и `:721-729`:

```ts
if (!allowBotSync(req)) {
  requireAdmin(req, res, () => {});   // уже отправляет 401
  if (!req.adminActor) {
    return res.status(401).json(...); // вторая отправка → ERR_HTTP_HEADERS_SENT
  }
}
```

`requireAdmin` при ошибке сам вызывает `res.status(401).json()`. После этого код пытается отправить ответ ещё раз, ловит `ERR_HTTP_HEADERS_SENT`, а в `catch` снова пытается отправить 500. В Express 4 это превращается в unhandled rejection, и Node 24 завершает процесс.

Проверено изолированно на `express@4.22.2`: `UNHANDLED_REJECTION: ERR_HTTP_HEADERS_SENT` → процесс завершается.

Достаточно одного запроса без токена:

```http
GET /api/admin/objects/<любой-id>
GET /api/admin/users/notify-subscribers
```

Важно: **на текущем проде эти маршруты отвечают 401 и не падают** — значит, там развёрнута более старая ревизия. После деплоя текущего кода уязвимость станет активной. Исправить до выката: разделить проверку прав на middleware `requireAdminOrBot`, которая не отправляет ответ сама, либо переписать маршруты через `router.get(..., requireAdmin, ...)`.

### P0-2. Риск миграций `0_init`

В `backend/prisma/migrations/0_init/migration.sql` таблицы создаются обычным `CREATE TABLE "Object" ...` без `IF NOT EXISTS` (`:32`, `:189`, `:205`). Старые миграции перенесены в `migrations_legacy_20261016_092429/`.

Если в проде в `_prisma_migrations` уже записаны старые миграции, `prisma migrate deploy` попытается применить `0_init` поверх существующих таблиц и упадёт. Если чинить через сброс БД — потеря данных.

Перед деплоем обязательно:

```bash
cd backend
npx prisma migrate status
```

Если база уже существует: сделать бэкап, затем при необходимости `npx prisma migrate resolve --applied 0_init`, а не запускать `deploy` вслепую.

### P0-3. Секрет бота по открытому HTTP

- `docker-compose.bot.yml` публикует `8080:8080` наружу.
- `bot/bot.py:33-36`, `:62-65`, `:178-181` — вебхуки защищены только `x-bot-sync-secret`.
- Этот же секрет даёт доступ к:
  - `/api/auth/telegram/bot-sync` — создание/изменение пользователей;
  - `/api/auth/telegram/notify-toggle`;
  - `/api/admin/users/notify-subscribers` — выгрузка Telegram ID всех подписчиков;
  - `/api/admin/objects/:id` — чтение любых объектов, включая неодобренные.

Если backend ходит на `http://<NL-IP>:8080`, секрет идёт по интернету в открытом виде. Нужно: TLS/mTLS, firewall allowlist только IP RF-сервера, отдельный узкий токен для бота, ротация секрета. Порт 8080 не должен быть доступен всему интернету.

---

## 3. Безопасность: высокий приоритет

### 3.1. Публичная выдача внутренних данных объекта

`GET /api/objects/:id` (`backend/src/routes/objects.ts:158-173`) отдаёт всем:

- `expenses` — включая `ownerOnly: true`;
- `leases` с арендными ставками;
- `commercialOffer.content` — может содержать контакты и условия сделки;
- `placement.price` — сколько собственник заплатил за размещение;
- `offerFileUrl` — прямая ссылка на КП.

Плюс `/api/objects/:id/offer/download` и `/uploads/*` публичны (`objects.ts:192`, `index.ts:178-204`). Даже если КП задумано публичным, `ownerOnly`-расходы и цена размещения — внутренние данные. Нужен отдельный public-DTO с явным `select`, без служебных полей.

### 3.2. `PUT /api/admin/objects/:id` затирает данные

`backend/src/routes/admin.ts:324-341`: схема `updateObjectSchema = createObjectSchema.partial()`, но затем:

```ts
city: data.city || null,
monthlyRent: data.monthlyRent || null,
annualRevenue: data.annualRevenue || null,
leaseEndDate: data.leaseEndDate || null,
anchorTenantName: data.anchorTenantName || null,
priceIndicator: data.priceIndicator || null,
description: data.description || null,
image: data.image || null,
```

Любое частичное обновление (например, только `title`) обнулит все перечисленные поля. Сейчас фронтенд присылает полный payload, но API — публичный контракт, и любой другой клиент/скрипт устроит потерю данных. Нужно передавать только `!== undefined` поля.

### 3.3. Атрибуция, аудит и комиссии доверяют клиенту

- `POST /api/attribution/first-touch` (`attribution.ts:99-110`) без авторизации и rate limit принимает произвольные `telegramId`, `phone`, `email`, `source`, `campaign`. Можно заранее «привязать» чужой телефон/Telegram к нужному источнику, испортив атрибуцию и комиссии, либо заспамить таблицу.
- `POST /api/audit` (`audit.ts:44-82`) позволяет пользователю самому создавать события `commission_released`, `payment_received`, `contact_disclosed` и т.п. Аудит-лог перестаёт быть доверенным.
- `POST /api/commissions/:dealId/reserve` (`commissions.ts:61-70`) принимает `amount` от клиента; комиссия считается от этой суммы, а не от цены сделки. Участник сделки может создать произвольную комиссию, в том числе несколько на одну сделку.
- `POST /api/deals` (`deals.ts:12-16`, `:83-88`) позволяет покупателю указать любую цену сделки, не привязанную к объекту.
- `PATCH /api/deals/:id/stage` разрешает любому участнику произвольные переходы стадий, включая `closed`/`cancelled`, без проверки комиссий и платежей.

Это не только безопасность, но и целостность финансовых данных. Финансовые события должны генерироваться только сервером; комиссия — рассчитываться из `deal.price`; на сделку — одна комиссия (`@@unique([dealId])`); переходы стадий — по конечному автомату с ролями.

### 3.4. Управление админ-доступом

- `admin.ts:135-140`: бессрочный статический `ADMIN_TOKEN` всё ещё принимается в `x-admin-token`. Он не имеет срока жизни и отзыва, кроме смены env и рестарта. Frontend его больше не использует — лучше удалить.
- `admin-auth.ts:59-63`: админский JWT на 12 часов хранится в `localStorage` (`adminApi.ts:8-13`). Любая XSS = кража админ-сессии. Нужен `HttpOnly; Secure; SameSite` cookie либо короткоживущий токен + refresh.
- `AdminRoute.tsx` проверяет только `localStorage.adminUser`; это лишь UI-защита (API всё равно проверяет токен), но позволяет показывать админ-интерфейс с подделанным localStorage.

### 3.5. Сессии и токены

- `JWT_SECRET` используется и для пользовательских JWT, и для гостевых токенов заявок (`auth.ts:87-89`, `leads.ts:87-100`). Гостевой токен живёт 365 дней. Нужны отдельные секреты и более короткий срок.
- `authMiddleware` на каждый запрос делает `SELECT` пользователя (`jwt.ts:43-60`) — это и нагрузка на БД, и отсутствие кэша/отзыва.
- Токен живёт 1 час, refresh нет. В Mini App пользователь «разлогинится» через час без перезагрузки.
- Нет `iss`/`aud`, нет списка отзыва.

### 3.6. Регистрация и персональные данные

- `POST /api/auth/register` (`auth.ts:46-97`) не фиксирует согласие на обработку ПДн, хотя телефон/email/пароль — персональные данные. В `RegisterPage.tsx` нет чекбокса согласия и ссылки на политику. Для 152-ФЗ это пробел.
- `PUT /api/auth/profile` (`auth.ts:430-510`) не валидирует длина/формат `firstName`, `lastName`, `username`, `phone`, `email`. Можно записать мусор и раздуть БД; телефон/email меняются без подтверждения.
- Нет политики хранения/удаления ПДн, нет экспорта/удаления аккаунта.
- В логах есть редакция чувствительных полей, но `logger.error(..., error)` может писать стек/сообщения Prisma с данными.

### 3.7. Прочее

- `middleware/auth.ts` — мёртвый код (initData-only middleware), лучше удалить, чтобы его случайно не подключили.
- `POST /api/auth/telegram` (`auth.ts:177-238`): гонка `findUnique` → `create` может давать 500 при параллельных запросах; нужен обработчик `P2002`.
- `/api/leads` rate limit 10/мин навешан на весь роутер (`index.ts:155`), включая админские `GET`, `PATCH`, `DELETE`. Админка начнёт получать 429 при активной работе. Лимитер нужен только на `POST /`.
- `/health` через nginx возвращает `index.html` с кодом 200 (SPA fallback), а не health backend. Внешний мониторинг будет считать сервис живым при упавшем API. Нужен отдельный `location = /health` с `proxy_pass`.
- Нет `unhandledRejection`/`uncaughtException` обработчиков (`backend/src`).
- `nginx.conf` не задаёт CSP для HTML; `X-Frame-Options: DENY` может ломать Mini App в Telegram Web, где WebApp открывается в iframe. Нужен `frame-ancestors` под Telegram.
- `server_tokens` не отключён — nginx раскрывает версию (`nginx/1.31.8`).
- `.env` и `backend/.env` имеют права `644` — стоит `600`.
- В git отслеживаются файлы `backend/uploads/*.pdf` и `*.webp` (`git ls-files`), хотя `uploads/` в `.gitignore`. Это бизнес-документы в истории репозитория. Нужно удалить из индекса и при необходимости почистить историю.

---

## 4. Зависимости

`npm audit --omit=dev` для backend: **2 critical, 8 high, 2 moderate**.

| Пакет | Severity | Комментарий |
|---|---|---|
| `proxy-addr` | critical | подмена IP при `trust proxy`; влияет на rate limit и consent IP |
| `tar` | critical | транзитивно через `bcrypt`/`node-pre-gyp`, в основном build-time |
| `body-parser` | high | DoS через сжатое тело; runtime |
| `multer` | high | DoS при асинхронном `fileFilter`; runtime |
| `zod` | high | переполнение памяти на больших коллекциях; особенно важно из-за `types` без `.max()` |
| `follow-redirects` | high | утечка заголовков при редиректах через axios |
| `prisma` / `@prisma/config` / `deepmerge-ts` | high | tooling |
| `file-type` | moderate | ZIP-бомба/бесконечный цикл при разборе файлов |
| `qs` | moderate | DoS/обход лимитов массивов |

Действия: `npm audit fix`, затем точечно обновить `express`, `multer`, `zod`, `file-type`, `axios`; после — прогнать тесты. Frontend `npm audit` чистый.

---

## 5. Производительность

### 5.1. Каталог грузится целиком на каждый ввод символа

`frontend/src/utils/useObjects.ts:103-135`: страница запрашивает **все** страницы каталога (`PAGE_SIZE = 100`) последовательными запросами, а `CatalogFilters.tsx` меняет `filters` на каждый `onChange` поля. То есть каждое нажатие клавиши в фильтре вызывает загрузку всего каталога.

Сейчас в проде 6 объектов, поэтому незаметно. На 5–10 тыс. объектов это десятки запросов и мегабайты JSON на каждое нажатие. Нужно: debounce 300–500 мс, пагинация/бесконечная прокрутка, `AbortController`, отмена устаревших запросов.

Дополнительно: `CatalogPage.tsx:35-41` перезапрашивает всё каждые 10 минут и на каждый `visibilitychange`; при переключении вкладок это лишние полные загрузки.

### 5.2. Кэш каталога — риск OOM и cache stampede

`backend/src/utils/cache.ts:5-21`:

- до 500 записей, каждая — полный ответ со всеми `images` и `tenants`;
- нет ограничения по размеру в байтах;
- нет дедупликации одновременных запросов (thundering herd);
- `invalidateCache` нигде не вызывается — изменения в админке не сбрасывают кэш;
- ключ включает произвольные фильтры, включая `anchorTenant` и `types` без ограничения количества. Атакующий уникальными фильтрами наполняет кэш и грузит БД, а публичный `/api/objects` не имеет rate limit.

Нужно: LRU с byte-budget, TTL, in-flight dedupe, инвалидация после записи, ограничение `types` (например, `.max(20)`), лимит уникальных фильтров и rate limit на публичное API.

### 5.3. Лишний payload

`objects.ts:98-102` для каталога включает `tenants: true` и полный объект со всеми скалярными полями. Карточке нужны только `id/title/type/price/yield/location/city/area/images[0]`. `offerFileUrl` и `offerFileName` в каталоге не нужны. Это уменьшит ответ и нагрузку на БД/сеть в разы.

### 5.4. PostgreSQL

- `findMany + count` на каждый фильтр; `count` по `OR` с `contains: insensitive` по `Tenant.name` — дорогой запрос без trigram-индекса.
- `skip` до `(1_000_000 - 1) * 100` — глубокий OFFSET будет очень медленным. Нужен keyset pagination и лимит страниц.
- Нет составного индекса под `moderation.status + city/type/price/createdAt`; фильтр `moderation: { is: { status: 'approved' } }` — join.
- Контейнер Postgres: 1 CPU / 1 GB, без настройки `shared_buffers`, `effective_cache_size`, `shm_size`.
- Prisma pool по умолчанию (~3 соединения на 1 CPU); при нескольких репликах нужен PgBouncer и явный `connection_limit`.

### 5.5. Логи и Prisma

- `prisma.ts:7-18`: включён `log: [{ emit: 'event', level: 'query' }]` — событие на **каждый** запрос, даже если оно отбрасывается. Это заметный overhead. Нужно включать только по env или использовать `pg_stat_statements`.
- `logger.ts:82`: уровень по умолчанию `debug` в production — каждый запрос пишется дважды (`in`/`out`) синхронным `console.log` в stdout. Под нагрузкой это блокирует event loop и раздувает логи. Нужен `LOG_LEVEL=info` по умолчанию и JSON-формат.
- Нет метрик/трейсинга/Sentry.

### 5.6. Уведомления и файлы

- `notifyBotOfLead` в `POST /api/leads` (`leads.ts:222`) ждёт вебхук до 5 с; при недоступном боте создание заявки замедляется. Fallback `sendTelegramMessage` может ждать до ~24 с (3 попытки × 8 с), что близко к `requestTimeout = 30s`.
- Бот отправляет уведомления подписчикам последовательно (`bot.py:124-171`), без обработки Telegram 429/`retry_after`, без очереди и ретраев. При росте подписчиков вебхук будет отваливаться по таймауту, а часть сообщений теряться.
- `sharp` в bulk-загрузке запускается `Promise.all` на 10 файлов без ограничения конкурентности — пики памяти при лимите 768 MB.
- Нет очистки осиротевших файлов: при удалении объекта удаляются только `image` и `offerFileUrl`, но не файлы `ObjectImage`; при замене КП старый файл остаётся. Том `backend-uploads` растёт бесконечно.
- `processImage` для `.webp` возвращает файл без resize/сжатия.

### 5.7. Статика

`nginx.conf` не задаёт `expires` для `/assets/*`. Vite-файлы хэшированные и неизменяемые — им нужен `Cache-Control: public, max-age=31536000, immutable`, а `index.html` — `no-cache`. Сейчас кэширование статики не оптимально.

---

## 6. Масштабирование

Текущая архитектура — один RF-сервер (nginx + frontend + backend + Postgres) и один NL-сервер (bot polling). Горизонтально backend масштабировать нельзя из-за трёх stateful-компонентов:

| Компонент | Проблема | Решение |
|---|---|---|
| Файлы | локальный volume `backend-uploads` | S3-совместимое хранилище (Selectel Object Storage) + CDN, signed URL при необходимости |
| Кэш | in-memory `Map` в процессе | Redis (общий кэш + rate limit + очередь) |
| Rate limit | PostgreSQL-таблица, запись на каждый запрос | Redis с TTL, либо оставить БД только для auth-эндпоинтов |
| Уведомления | синхронно в HTTP-запросе | очередь (BullMQ/Redis, arq) + воркеры + ретраи + 429-обработка |
| Bot | polling, один процесс | webhook + несколько воркеров, либо оставить polling, но вынести отправку в очередь |
| БД | один инстанс 1 vCPU/1 GB | вертикально + read replica для каталога, PgBouncer, управляемый Postgres с бэкапами |
| Статика | nginx на том же сервере | CDN перед frontend |

После выноса файлов и кэша API становится stateless: можно запускать 2–3 реплики backend за nginx upstream. JWT это позволяет, но понадобится общий Redis для rate limit и, желательно, отзыва токенов.

Отдельно по данным: денормализовать `moderationStatus` в `Object` (или материализованное представление), перейти на keyset pagination, добавить `pg_trgm` GIN-индексы для `anchorTenantName`/`Tenant.name`, ограничить глубину страниц.

---

## 7. Эксплуатация и надёжность

- **Нет бэкапов PostgreSQL.** Только volume `postgres-data`. Нужны регулярные `pg_dump`/pgBackRest, хранение вне сервера и регулярная проверка восстановления.
- **Нет мониторинга и алертинга.** Healthcheck Docker не заменяет внешний uptime; `/health` через nginx даёт ложный 200 (SPA). Нет метрик, трейсинга, Sentry.
- **Нет CI/CD.** Деплой — `git pull` + сборка на проде, без тестов, тегов образов и rollback. Нужен pipeline: lint → test → build → migrate (с бэкапом) → deploy.
- **Тесты опасны для данных.** `backend/tests/api.test.ts:430-440` удаляет реальный approved-объект, тесты требуют живую БД. Запуск `npm test` против прод-базы уничтожит данные. Нужна отдельная тестовая БД и guard по имени БД.
- **Lint frontend не проходит:** 4 ошибки `react-hooks/set-state-in-effect` в `LeadFormPage`, `ObjectPage`, `OfferPage`, `ModerationQueuePage` + 1 warning. Это расходится с записью в `AGENTS.MD` о «всех зелёных тестах».
- **Docker-образы не запинены** (`node:24-slim`, `postgres:17-alpine`, `python:3.12-slim`, `nginx:alpine`). Нет сканирования, SBOM, подписи. В runtime backend копируются devDependencies (`tsx`, `vitest`, `typescript`, `prisma` CLI) — лишняя поверхность атаки и размер.
- **Нет `cap_drop`, `read_only`, `no-new-privileges`**, frontend nginx работает от root.
- **Certbot не входит в compose**; сертификаты монтируются из `/etc/letsencrypt`, продление — вручную. Риск истечения. Домен захардкожен в `nginx.conf`.
- **Деплой drift:** текущий прод отвечает 401 на маршрутах, которые в репозитории падают (P0-1), то есть на сервере старая ревизия. Нужен контроль версии (`/health` с git SHA) и запрет ручных расхождений.
- `AGENTS.MD` устарел: там «SSL не настроен» (фактически TLS 1.3 работает), «Vite 7» (в package.json Vite 6), в первой строке случайно вставлен старый текст ошибки.

---

## 8. Что сделано хорошо

- Строгая проверка обязательных env и запрет слабых дефолтов (`index.ts:32-56`).
- `helmet`, CORS-allowlist, отключён `x-powered-by`.
- Zod-валидация основных входных данных, лимиты размера тела и загрузок.
- `bcrypt` cost 12, timing-safe сравнение секретов.
- Проверка magic bytes загрузок, защита от path traversal.
- Раздельные `JWT_SECRET` и `ADMIN_JWT_SECRET`, админский JWT с истечением.
- Проверка прав на сделках/комиссиях/аудитах (IDOR в целом закрыт).
- Backend работает non-root, есть graceful shutdown.
- Много индексов в Prisma-схеме, есть кэш и rate limit.
- TLS 1.3, HSTS, редирект с HTTP, запрет неразрешённых Origin (проверено на проде).

---

## 9. План исправлений

### До следующего деплоя

1. Исправить P0-1 (`requireAdmin` без двойной отправки ответа) и добавить интеграционный тест «без токена → 401, процесс жив».
2. Проверить `prisma migrate status` на проде, сделать бэкап, решить вопрос с baseline `0_init`.
3. Закрыть 8080 файрволом, перевести вебхук бота на TLS, выпустить отдельный узкий секрет, ротировать текущий.
4. Убрать из публичного ответа объекта `expenses`/`placement.price`/`commercialOffer`/`offerFileUrl`, если они не предназначены для всех; проверить, нужен ли публичный download КП.
5. Исправить частичное обновление объекта (не затирать `undefined`).
6. `npm audit fix` + обновление уязвимых пакетов.

### На неделю

7. Закрыть атрибуцию/аудит/комиссии: серверный расчёт, whitelist событий, auth/rate limit на `first-touch`.
8. Убрать `ADMIN_TOKEN`, перевести админ-сессию на HttpOnly cookie или короткоживущий токен; разнести гостевой и пользовательский JWT-секреты.
9. Добавить CSP/`frame-ancestors` для Telegram, `server_tokens off`, отдельный `/health` proxy, nginx rate limiting.
10. Настроить бэкапы, внешний uptime, `unhandledRejection`, `LOG_LEVEL=info`, отключить query-логирование Prisma в prod.
11. Frontend: debounce фильтров, пагинация/бесконечная прокрутка, отмена запросов, кэш статики.

### На месяц

12. Redis + S3 + очередь уведомлений; вынести файлы и кэш из контейнера.
13. PgBouncer/read replica, keyset pagination, pg_trgm-индексы, денормализация статуса модерации.
14. CI/CD с тестовой БД, миграционным gate и rollback; сканирование образов, пиннинг версий.
15. Политика ПДн: согласие при регистрации, сроки хранения, удаление аккаунта, аудит действий администраторов.

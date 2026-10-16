--
-- PostgreSQL database dump
--

\restrict rNXqN6lfvMuvHRUmM2xd1FVC5vEcKdqoxXkWXT2ECxdIupcwm6EjDnlTjPdvH0c

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: app_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO app_user;

--
-- Name: AuditEventType; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."AuditEventType" AS ENUM (
    'user_registered',
    'user_verified',
    'deal_created',
    'deal_stage_changed',
    'offer_sent',
    'counter_offer_sent',
    'deposit_paid',
    'contract_signed',
    'registration_completed',
    'deal_closed',
    'payment_received',
    'commission_reserved',
    'commission_released',
    'contact_disclosed',
    'chat_message_sent',
    'anti_bypass_violation',
    'deal_alert_created'
);


ALTER TYPE public."AuditEventType" OWNER TO app_user;

--
-- Name: CommissionStatus; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."CommissionStatus" AS ENUM (
    'pending',
    'reserved',
    'released',
    'refunded'
);


ALTER TYPE public."CommissionStatus" OWNER TO app_user;

--
-- Name: DealStage; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."DealStage" AS ENUM (
    'offer',
    'counter_offer',
    'deposit',
    'verification',
    'contract',
    'registration',
    'closed',
    'cancelled'
);


ALTER TYPE public."DealStage" OWNER TO app_user;

--
-- Name: DealStatus; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."DealStatus" AS ENUM (
    'active',
    'completed',
    'cancelled',
    'disputed'
);


ALTER TYPE public."DealStatus" OWNER TO app_user;

--
-- Name: ModerationStatus; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."ModerationStatus" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE public."ModerationStatus" OWNER TO app_user;

--
-- Name: PlacementType; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."PlacementType" AS ENUM (
    'standard',
    'paid',
    'exclusive'
);


ALTER TYPE public."PlacementType" OWNER TO app_user;

--
-- Name: PriceIndicator; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."PriceIndicator" AS ENUM (
    'below_market',
    'market',
    'above_market'
);


ALTER TYPE public."PriceIndicator" OWNER TO app_user;

--
-- Name: TouchSource; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."TouchSource" AS ENUM (
    'direct',
    'deep_link',
    'referral',
    'utm',
    'qr',
    'invite'
);


ALTER TYPE public."TouchSource" OWNER TO app_user;

--
-- Name: VerificationMethod; Type: TYPE; Schema: public; Owner: app_user
--

CREATE TYPE public."VerificationMethod" AS ENUM (
    'telegram',
    'sms',
    'email'
);


ALTER TYPE public."VerificationMethod" OWNER TO app_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AntiBypassRule; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."AntiBypassRule" (
    id text NOT NULL,
    name text NOT NULL,
    pattern text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AntiBypassRule" OWNER TO app_user;

--
-- Name: Attribution; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Attribution" (
    id text NOT NULL,
    "userId" text,
    "telegramId" text,
    phone text,
    email text,
    "firstTouchSource" public."TouchSource" DEFAULT 'direct'::public."TouchSource" NOT NULL,
    "firstTouchCampaign" text,
    "firstTouchReferrer" text,
    "firstSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastIp" text,
    "deviceFingerprint" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Attribution" OWNER TO app_user;

--
-- Name: AuditEvent; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."AuditEvent" (
    id text NOT NULL,
    "eventType" public."AuditEventType" NOT NULL,
    "userId" text,
    "dealId" text,
    "objectId" text,
    metadata jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditEvent" OWNER TO app_user;

--
-- Name: Chat; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Chat" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    participant1 text NOT NULL,
    participant2 text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Chat" OWNER TO app_user;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    "senderId" text NOT NULL,
    body text NOT NULL,
    filtered boolean DEFAULT false NOT NULL,
    "filterReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO app_user;

--
-- Name: CommercialOffer; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."CommercialOffer" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    content jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."CommercialOffer" OWNER TO app_user;

--
-- Name: Commission; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Commission" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    amount integer NOT NULL,
    rate integer DEFAULT 20 NOT NULL,
    status public."CommissionStatus" DEFAULT 'pending'::public."CommissionStatus" NOT NULL,
    "reservedAt" timestamp(3) without time zone,
    "releasedAt" timestamp(3) without time zone,
    "releasedTo" text,
    "paymentMethod" text,
    "providerRef" text,
    "bankStatementUrl" text,
    "confirmedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Commission" OWNER TO app_user;

--
-- Name: Consent; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Consent" (
    id text NOT NULL,
    "userId" text,
    "leadId" text,
    "consentType" text NOT NULL,
    version text NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "telegramId" text,
    "acceptedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Consent" OWNER TO app_user;

--
-- Name: Deal; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Deal" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    "buyerId" text NOT NULL,
    "sellerId" text,
    "agentId" text,
    price integer NOT NULL,
    currency text DEFAULT 'RUB'::text NOT NULL,
    stage public."DealStage" DEFAULT 'offer'::public."DealStage" NOT NULL,
    status public."DealStatus" DEFAULT 'active'::public."DealStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "closedAt" timestamp(3) without time zone
);


ALTER TABLE public."Deal" OWNER TO app_user;

--
-- Name: DealStageLog; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."DealStageLog" (
    id text NOT NULL,
    "dealId" text NOT NULL,
    "fromStage" text,
    "toStage" text NOT NULL,
    "changedBy" text NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."DealStageLog" OWNER TO app_user;

--
-- Name: EngineeringSpec; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."EngineeringSpec" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    "electricityKw" integer,
    "waterParams" text,
    "gasParams" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."EngineeringSpec" OWNER TO app_user;

--
-- Name: Expense; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Expense" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    name text NOT NULL,
    amount integer NOT NULL,
    "compensatedByTenant" boolean DEFAULT false NOT NULL,
    "ownerOnly" boolean DEFAULT false NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Expense" OWNER TO app_user;

--
-- Name: Favorite; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Favorite" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "objectId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Favorite" OWNER TO app_user;

--
-- Name: Lead; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Lead" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    "userId" text,
    "clientId" text,
    name text NOT NULL,
    phone text NOT NULL,
    comment text,
    status text DEFAULT 'new'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Lead" OWNER TO app_user;

--
-- Name: Lease; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Lease" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    "tenantId" text NOT NULL,
    "startDate" timestamp(3) without time zone NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "monthlyRent" integer NOT NULL,
    "isFixed" boolean DEFAULT true NOT NULL,
    "percentOfTurnover" double precision,
    "indexationPercent" double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Lease" OWNER TO app_user;

--
-- Name: LegalConstraint; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."LegalConstraint" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    type text NOT NULL,
    description text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LegalConstraint" OWNER TO app_user;

--
-- Name: Moderation; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Moderation" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    status public."ModerationStatus" DEFAULT 'pending'::public."ModerationStatus" NOT NULL,
    note text,
    "moderatedAt" timestamp(3) without time zone,
    "moderatedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Moderation" OWNER TO app_user;

--
-- Name: Object; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Object" (
    id text NOT NULL,
    title text NOT NULL,
    type text NOT NULL,
    price integer NOT NULL,
    "yieldPercent" double precision NOT NULL,
    location text NOT NULL,
    city text,
    area integer NOT NULL,
    image text,
    description text,
    "monthlyRent" integer,
    "annualRevenue" integer,
    "leaseEndDate" timestamp(3) without time zone,
    "anchorTenantName" text,
    "priceIndicator" public."PriceIndicator",
    "offerFileUrl" text,
    "offerFileName" text,
    "offerFileType" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Object" OWNER TO app_user;

--
-- Name: ObjectImage; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."ObjectImage" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    url text NOT NULL,
    sort integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."ObjectImage" OWNER TO app_user;

--
-- Name: Payment; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Payment" (
    id text NOT NULL,
    "dealId" text,
    "objectId" text NOT NULL,
    amount integer NOT NULL,
    currency text DEFAULT 'RUB'::text NOT NULL,
    method text,
    status text DEFAULT 'pending'::text NOT NULL,
    "paidAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payment" OWNER TO app_user;

--
-- Name: PaymentProvider; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."PaymentProvider" (
    id text NOT NULL,
    name text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    config jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PaymentProvider" OWNER TO app_user;

--
-- Name: Payout; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Payout" (
    id text NOT NULL,
    "commissionId" text NOT NULL,
    amount integer NOT NULL,
    "toUserId" text,
    "toAccount" text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    "processedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Payout" OWNER TO app_user;

--
-- Name: PhoneVerification; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."PhoneVerification" (
    id text NOT NULL,
    "userId" text,
    phone text NOT NULL,
    "codeHash" text NOT NULL,
    method public."VerificationMethod" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."PhoneVerification" OWNER TO app_user;

--
-- Name: Placement; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Placement" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    type public."PlacementType" DEFAULT 'standard'::public."PlacementType" NOT NULL,
    price integer,
    "isExclusive" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Placement" OWNER TO app_user;

--
-- Name: Referral; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Referral" (
    id text NOT NULL,
    "referrerId" text NOT NULL,
    "refereeId" text NOT NULL,
    source text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Referral" OWNER TO app_user;

--
-- Name: Tenant; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."Tenant" (
    id text NOT NULL,
    name text NOT NULL,
    "isAnchor" boolean DEFAULT false NOT NULL,
    category text,
    "objectId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tenant" OWNER TO app_user;

--
-- Name: User; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "telegramId" text,
    "telegramPhotoUrl" text,
    "telegramLang" text,
    "telegramPremium" boolean DEFAULT false,
    "telegramAllowsPm" boolean DEFAULT false,
    phone text,
    email text,
    "passwordHash" text,
    role text DEFAULT 'user'::text,
    "firstName" text,
    "lastName" text,
    username text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."User" OWNER TO app_user;

--
-- Name: VatRate; Type: TABLE; Schema: public; Owner: app_user
--

CREATE TABLE public."VatRate" (
    id text NOT NULL,
    "objectId" text NOT NULL,
    rate integer NOT NULL,
    note text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."VatRate" OWNER TO app_user;

--
-- Data for Name: AntiBypassRule; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."AntiBypassRule" (id, name, pattern, enabled, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Attribution; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Attribution" (id, "userId", "telegramId", phone, email, "firstTouchSource", "firstTouchCampaign", "firstTouchReferrer", "firstSeenAt", "lastSeenAt", "lastIp", "deviceFingerprint", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: AuditEvent; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."AuditEvent" (id, "eventType", "userId", "dealId", "objectId", metadata, "ipAddress", "userAgent", "createdAt") FROM stdin;
\.


--
-- Data for Name: Chat; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Chat" (id, "dealId", participant1, participant2, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."ChatMessage" (id, "chatId", "senderId", body, filtered, "filterReason", "createdAt") FROM stdin;
\.


--
-- Data for Name: CommercialOffer; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."CommercialOffer" (id, "objectId", content, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Commission; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Commission" (id, "dealId", amount, rate, status, "reservedAt", "releasedAt", "releasedTo", "paymentMethod", "providerRef", "bankStatementUrl", "confirmedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Consent; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Consent" (id, "userId", "leadId", "consentType", version, "ipAddress", "userAgent", "telegramId", "acceptedAt") FROM stdin;
\.


--
-- Data for Name: Deal; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Deal" (id, "objectId", "buyerId", "sellerId", "agentId", price, currency, stage, status, "createdAt", "updatedAt", "closedAt") FROM stdin;
\.


--
-- Data for Name: DealStageLog; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."DealStageLog" (id, "dealId", "fromStage", "toStage", "changedBy", note, "createdAt") FROM stdin;
\.


--
-- Data for Name: EngineeringSpec; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."EngineeringSpec" (id, "objectId", "electricityKw", "waterParams", "gasParams", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Expense" (id, "objectId", name, amount, "compensatedByTenant", "ownerOnly", note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Favorite; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Favorite" (id, "userId", "objectId", "createdAt") FROM stdin;
\.


--
-- Data for Name: Lead; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Lead" (id, "objectId", "userId", "clientId", name, phone, comment, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Lease; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Lease" (id, "objectId", "tenantId", "startDate", "endDate", "monthlyRent", "isFixed", "percentOfTurnover", "indexationPercent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: LegalConstraint; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."LegalConstraint" (id, "objectId", type, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Moderation; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Moderation" (id, "objectId", status, note, "moderatedAt", "moderatedBy", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Object; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Object" (id, title, type, price, "yieldPercent", location, city, area, image, description, "monthlyRent", "annualRevenue", "leaseEndDate", "anchorTenantName", "priceIndicator", "offerFileUrl", "offerFileName", "offerFileType", "createdAt", "updatedAt") FROM stdin;
cmvb5c3n10000p03h322rsi63	БЦ «Азинский»	Офис	125000000	8	Казань, ул. Пушкина, 51	Казань	3500	https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fm=webp	Современный бизнес-центр класса А в центре города. Развитая инфраструктура, удобная транспортная доступность, высокий спрос на аренду.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:52:33.134	2026-10-16 15:52:33.134
cmvb5c3n10001p03h885ms2v1	ТЦ «Восточный»	Торговое помещение	250000000	10	Москва, ул. Ленина, 10	Москва	5000	https://images.unsplash.com/photo-1604014237800-1c9106c0b2b3?w=800&q=80&fm=webp	Торговый центр высокого класса в центре города. Высокий пешеходный трафик, якорные арендаторы.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:52:33.134	2026-10-16 15:52:33.134
cmvb5c3n10002p03hfuu5xnjq	Складской комплекс «Логистик»	Склад	95000000	12	Казань, ул. Промышленная, 25	Казань	8000	https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&fm=webp	Современный складской комплекс с рампой, высокими потолками и удобной транспортной развязкой.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:52:33.134	2026-10-16 15:52:33.134
cmvb5c3n10003p03hdekmmudg	Офисный центр «Горизонт»	Офис	180000000	9	Москва, ул. Мира, 45	Москва	4200	https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&fm=webp	Офисный центр премиум-класса с панорамным остеклением и собственной инфраструктурой.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:52:33.134	2026-10-16 15:52:33.134
cmvb5emsw0000p03hy5lohpcr	БЦ «Азинский»	Офис	125000000	8	Казань, ул. Пушкина, 51	Казань	3500	https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fm=webp	Современный бизнес-центр класса А в центре города. Развитая инфраструктура, удобная транспортная доступность, высокий спрос на аренду.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:54:31.28	2026-10-16 15:54:31.28
cmvb5emsw0001p03huqbj076s	ТЦ «Восточный»	Торговое помещение	250000000	10	Москва, ул. Ленина, 10	Москва	5000	https://images.unsplash.com/photo-1604014237800-1c9106c0b2b3?w=800&q=80&fm=webp	Торговый центр высокого класса в центре города. Высокий пешеходный трафик, якорные арендаторы.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:54:31.28	2026-10-16 15:54:31.28
cmvb5emsw0002p03hq51eobim	Складской комплекс «Логистик»	Склад	95000000	12	Казань, ул. Промышленная, 25	Казань	8000	https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&fm=webp	Современный складской комплекс с рампой, высокими потолками и удобной транспортной развязкой.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:54:31.28	2026-10-16 15:54:31.28
cmvb5emsw0003p03h0non038v	Офисный центр «Горизонт»	Офис	180000000	9	Москва, ул. Мира, 45	Москва	4200	https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&fm=webp	Офисный центр премиум-класса с панорамным остеклением и собственной инфраструктурой.	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-16 15:54:31.28	2026-10-16 15:54:31.28
\.


--
-- Data for Name: ObjectImage; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."ObjectImage" (id, "objectId", url, sort, "createdAt") FROM stdin;
\.


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Payment" (id, "dealId", "objectId", amount, currency, method, status, "paidAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PaymentProvider; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."PaymentProvider" (id, name, enabled, config, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Payout; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Payout" (id, "commissionId", amount, "toUserId", "toAccount", status, "processedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: PhoneVerification; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."PhoneVerification" (id, "userId", phone, "codeHash", method, attempts, "maxAttempts", verified, "expiresAt", "verifiedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: Placement; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Placement" (id, "objectId", type, price, "isExclusive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Referral; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Referral" (id, "referrerId", "refereeId", source, "createdAt") FROM stdin;
\.


--
-- Data for Name: Tenant; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."Tenant" (id, name, "isAnchor", category, "objectId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."User" (id, "telegramId", "telegramPhotoUrl", "telegramLang", "telegramPremium", "telegramAllowsPm", phone, email, "passwordHash", role, "firstName", "lastName", username, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: VatRate; Type: TABLE DATA; Schema: public; Owner: app_user
--

COPY public."VatRate" (id, "objectId", rate, note, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: AntiBypassRule AntiBypassRule_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."AntiBypassRule"
    ADD CONSTRAINT "AntiBypassRule_pkey" PRIMARY KEY (id);


--
-- Name: Attribution Attribution_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Attribution"
    ADD CONSTRAINT "Attribution_pkey" PRIMARY KEY (id);


--
-- Name: AuditEvent AuditEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Chat Chat_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_pkey" PRIMARY KEY (id);


--
-- Name: CommercialOffer CommercialOffer_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."CommercialOffer"
    ADD CONSTRAINT "CommercialOffer_pkey" PRIMARY KEY (id);


--
-- Name: Commission Commission_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_pkey" PRIMARY KEY (id);


--
-- Name: Consent Consent_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Consent"
    ADD CONSTRAINT "Consent_pkey" PRIMARY KEY (id);


--
-- Name: DealStageLog DealStageLog_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."DealStageLog"
    ADD CONSTRAINT "DealStageLog_pkey" PRIMARY KEY (id);


--
-- Name: Deal Deal_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_pkey" PRIMARY KEY (id);


--
-- Name: EngineeringSpec EngineeringSpec_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."EngineeringSpec"
    ADD CONSTRAINT "EngineeringSpec_pkey" PRIMARY KEY (id);


--
-- Name: Expense Expense_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_pkey" PRIMARY KEY (id);


--
-- Name: Favorite Favorite_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_pkey" PRIMARY KEY (id);


--
-- Name: Lead Lead_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_pkey" PRIMARY KEY (id);


--
-- Name: Lease Lease_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lease"
    ADD CONSTRAINT "Lease_pkey" PRIMARY KEY (id);


--
-- Name: LegalConstraint LegalConstraint_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."LegalConstraint"
    ADD CONSTRAINT "LegalConstraint_pkey" PRIMARY KEY (id);


--
-- Name: Moderation Moderation_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Moderation"
    ADD CONSTRAINT "Moderation_pkey" PRIMARY KEY (id);


--
-- Name: ObjectImage ObjectImage_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."ObjectImage"
    ADD CONSTRAINT "ObjectImage_pkey" PRIMARY KEY (id);


--
-- Name: Object Object_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Object"
    ADD CONSTRAINT "Object_pkey" PRIMARY KEY (id);


--
-- Name: PaymentProvider PaymentProvider_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."PaymentProvider"
    ADD CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY (id);


--
-- Name: Payment Payment_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_pkey" PRIMARY KEY (id);


--
-- Name: Payout Payout_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_pkey" PRIMARY KEY (id);


--
-- Name: PhoneVerification PhoneVerification_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."PhoneVerification"
    ADD CONSTRAINT "PhoneVerification_pkey" PRIMARY KEY (id);


--
-- Name: Placement Placement_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Placement"
    ADD CONSTRAINT "Placement_pkey" PRIMARY KEY (id);


--
-- Name: Referral Referral_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_pkey" PRIMARY KEY (id);


--
-- Name: Tenant Tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: VatRate VatRate_pkey; Type: CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."VatRate"
    ADD CONSTRAINT "VatRate_pkey" PRIMARY KEY (id);


--
-- Name: Attribution_firstSeenAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Attribution_firstSeenAt_idx" ON public."Attribution" USING btree ("firstSeenAt");


--
-- Name: Attribution_firstTouchSource_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Attribution_firstTouchSource_idx" ON public."Attribution" USING btree ("firstTouchSource");


--
-- Name: Attribution_phone_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Attribution_phone_idx" ON public."Attribution" USING btree (phone);


--
-- Name: Attribution_phone_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Attribution_phone_key" ON public."Attribution" USING btree (phone);


--
-- Name: Attribution_telegramId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Attribution_telegramId_idx" ON public."Attribution" USING btree ("telegramId");


--
-- Name: Attribution_telegramId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Attribution_telegramId_key" ON public."Attribution" USING btree ("telegramId");


--
-- Name: Attribution_userId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Attribution_userId_key" ON public."Attribution" USING btree ("userId");


--
-- Name: AuditEvent_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "AuditEvent_createdAt_idx" ON public."AuditEvent" USING btree ("createdAt");


--
-- Name: AuditEvent_dealId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "AuditEvent_dealId_idx" ON public."AuditEvent" USING btree ("dealId");


--
-- Name: AuditEvent_eventType_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "AuditEvent_eventType_idx" ON public."AuditEvent" USING btree ("eventType");


--
-- Name: AuditEvent_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "AuditEvent_objectId_idx" ON public."AuditEvent" USING btree ("objectId");


--
-- Name: AuditEvent_userId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "AuditEvent_userId_idx" ON public."AuditEvent" USING btree ("userId");


--
-- Name: ChatMessage_chatId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "ChatMessage_chatId_idx" ON public."ChatMessage" USING btree ("chatId");


--
-- Name: ChatMessage_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "ChatMessage_createdAt_idx" ON public."ChatMessage" USING btree ("createdAt");


--
-- Name: Chat_dealId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Chat_dealId_idx" ON public."Chat" USING btree ("dealId");


--
-- Name: Chat_participant1_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Chat_participant1_idx" ON public."Chat" USING btree (participant1);


--
-- Name: CommercialOffer_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "CommercialOffer_objectId_key" ON public."CommercialOffer" USING btree ("objectId");


--
-- Name: Commission_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Commission_createdAt_idx" ON public."Commission" USING btree ("createdAt");


--
-- Name: Commission_dealId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Commission_dealId_idx" ON public."Commission" USING btree ("dealId");


--
-- Name: Commission_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Commission_status_idx" ON public."Commission" USING btree (status);


--
-- Name: Consent_acceptedAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Consent_acceptedAt_idx" ON public."Consent" USING btree ("acceptedAt");


--
-- Name: Consent_consentType_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Consent_consentType_idx" ON public."Consent" USING btree ("consentType");


--
-- Name: Consent_leadId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Consent_leadId_idx" ON public."Consent" USING btree ("leadId");


--
-- Name: Consent_userId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Consent_userId_idx" ON public."Consent" USING btree ("userId");


--
-- Name: DealStageLog_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "DealStageLog_createdAt_idx" ON public."DealStageLog" USING btree ("createdAt");


--
-- Name: DealStageLog_dealId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "DealStageLog_dealId_idx" ON public."DealStageLog" USING btree ("dealId");


--
-- Name: Deal_buyerId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_buyerId_idx" ON public."Deal" USING btree ("buyerId");


--
-- Name: Deal_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_createdAt_idx" ON public."Deal" USING btree ("createdAt");


--
-- Name: Deal_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_objectId_idx" ON public."Deal" USING btree ("objectId");


--
-- Name: Deal_sellerId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_sellerId_idx" ON public."Deal" USING btree ("sellerId");


--
-- Name: Deal_stage_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_stage_idx" ON public."Deal" USING btree (stage);


--
-- Name: Deal_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Deal_status_idx" ON public."Deal" USING btree (status);


--
-- Name: EngineeringSpec_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "EngineeringSpec_objectId_key" ON public."EngineeringSpec" USING btree ("objectId");


--
-- Name: Expense_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Expense_objectId_idx" ON public."Expense" USING btree ("objectId");


--
-- Name: Favorite_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Favorite_userId_createdAt_idx" ON public."Favorite" USING btree ("userId", "createdAt");


--
-- Name: Favorite_userId_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Favorite_userId_objectId_key" ON public."Favorite" USING btree ("userId", "objectId");


--
-- Name: Lead_clientId_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_clientId_createdAt_idx" ON public."Lead" USING btree ("clientId", "createdAt");


--
-- Name: Lead_clientId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_clientId_idx" ON public."Lead" USING btree ("clientId");


--
-- Name: Lead_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_createdAt_idx" ON public."Lead" USING btree ("createdAt");


--
-- Name: Lead_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_objectId_idx" ON public."Lead" USING btree ("objectId");


--
-- Name: Lead_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_status_idx" ON public."Lead" USING btree (status);


--
-- Name: Lead_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_userId_createdAt_idx" ON public."Lead" USING btree ("userId", "createdAt");


--
-- Name: Lead_userId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lead_userId_idx" ON public."Lead" USING btree ("userId");


--
-- Name: Lease_endDate_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lease_endDate_idx" ON public."Lease" USING btree ("endDate");


--
-- Name: Lease_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lease_objectId_idx" ON public."Lease" USING btree ("objectId");


--
-- Name: Lease_tenantId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Lease_tenantId_idx" ON public."Lease" USING btree ("tenantId");


--
-- Name: LegalConstraint_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "LegalConstraint_objectId_idx" ON public."LegalConstraint" USING btree ("objectId");


--
-- Name: Moderation_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Moderation_objectId_key" ON public."Moderation" USING btree ("objectId");


--
-- Name: Moderation_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Moderation_status_idx" ON public."Moderation" USING btree (status);


--
-- Name: ObjectImage_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "ObjectImage_objectId_idx" ON public."ObjectImage" USING btree ("objectId");


--
-- Name: Object_area_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_area_idx" ON public."Object" USING btree (area);


--
-- Name: Object_city_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_city_idx" ON public."Object" USING btree (city);


--
-- Name: Object_city_price_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_city_price_idx" ON public."Object" USING btree (city, price);


--
-- Name: Object_city_type_price_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_city_type_price_idx" ON public."Object" USING btree (city, type, price);


--
-- Name: Object_createdAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_createdAt_idx" ON public."Object" USING btree ("createdAt");


--
-- Name: Object_leaseEndDate_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_leaseEndDate_idx" ON public."Object" USING btree ("leaseEndDate");


--
-- Name: Object_price_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_price_idx" ON public."Object" USING btree (price);


--
-- Name: Object_type_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_type_idx" ON public."Object" USING btree (type);


--
-- Name: Object_type_yieldPercent_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_type_yieldPercent_idx" ON public."Object" USING btree (type, "yieldPercent");


--
-- Name: Object_yieldPercent_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Object_yieldPercent_idx" ON public."Object" USING btree ("yieldPercent");


--
-- Name: PaymentProvider_name_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "PaymentProvider_name_key" ON public."PaymentProvider" USING btree (name);


--
-- Name: Payment_dealId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Payment_dealId_idx" ON public."Payment" USING btree ("dealId");


--
-- Name: Payment_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Payment_objectId_idx" ON public."Payment" USING btree ("objectId");


--
-- Name: Payment_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Payment_status_idx" ON public."Payment" USING btree (status);


--
-- Name: Payout_commissionId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Payout_commissionId_idx" ON public."Payout" USING btree ("commissionId");


--
-- Name: Payout_status_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Payout_status_idx" ON public."Payout" USING btree (status);


--
-- Name: PhoneVerification_expiresAt_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "PhoneVerification_expiresAt_idx" ON public."PhoneVerification" USING btree ("expiresAt");


--
-- Name: PhoneVerification_phone_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "PhoneVerification_phone_idx" ON public."PhoneVerification" USING btree (phone);


--
-- Name: PhoneVerification_verified_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "PhoneVerification_verified_idx" ON public."PhoneVerification" USING btree (verified);


--
-- Name: Placement_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Placement_objectId_key" ON public."Placement" USING btree ("objectId");


--
-- Name: Referral_refereeId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Referral_refereeId_idx" ON public."Referral" USING btree ("refereeId");


--
-- Name: Referral_referrerId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Referral_referrerId_idx" ON public."Referral" USING btree ("referrerId");


--
-- Name: Referral_referrerId_refereeId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "Referral_referrerId_refereeId_key" ON public."Referral" USING btree ("referrerId", "refereeId");


--
-- Name: Tenant_isAnchor_name_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Tenant_isAnchor_name_idx" ON public."Tenant" USING btree ("isAnchor", name);


--
-- Name: Tenant_objectId_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "Tenant_objectId_idx" ON public."Tenant" USING btree ("objectId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: User_role_idx; Type: INDEX; Schema: public; Owner: app_user
--

CREATE INDEX "User_role_idx" ON public."User" USING btree (role);


--
-- Name: User_telegramId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "User_telegramId_key" ON public."User" USING btree ("telegramId");


--
-- Name: VatRate_objectId_key; Type: INDEX; Schema: public; Owner: app_user
--

CREATE UNIQUE INDEX "VatRate_objectId_key" ON public."VatRate" USING btree ("objectId");


--
-- Name: AuditEvent AuditEvent_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: AuditEvent AuditEvent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."AuditEvent"
    ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessage ChatMessage_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: CommercialOffer CommercialOffer_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."CommercialOffer"
    ADD CONSTRAINT "CommercialOffer_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Commission Commission_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Commission"
    ADD CONSTRAINT "Commission_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Consent Consent_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Consent"
    ADD CONSTRAINT "Consent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Consent Consent_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Consent"
    ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: DealStageLog DealStageLog_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."DealStageLog"
    ADD CONSTRAINT "DealStageLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deal Deal_agentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Deal Deal_buyerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Deal Deal_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deal Deal_sellerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Deal"
    ADD CONSTRAINT "Deal_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: EngineeringSpec EngineeringSpec_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."EngineeringSpec"
    ADD CONSTRAINT "EngineeringSpec_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Expense Expense_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Expense"
    ADD CONSTRAINT "Expense_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Favorite Favorite_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Favorite"
    ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lead Lead_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lead Lead_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Lease Lease_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lease"
    ADD CONSTRAINT "Lease_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lease Lease_tenantId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Lease"
    ADD CONSTRAINT "Lease_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES public."Tenant"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LegalConstraint LegalConstraint_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."LegalConstraint"
    ADD CONSTRAINT "LegalConstraint_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Moderation Moderation_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Moderation"
    ADD CONSTRAINT "Moderation_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ObjectImage ObjectImage_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."ObjectImage"
    ADD CONSTRAINT "ObjectImage_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Payment Payment_dealId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Payment"
    ADD CONSTRAINT "Payment_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES public."Deal"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Payout Payout_commissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Payout"
    ADD CONSTRAINT "Payout_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES public."Commission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PhoneVerification PhoneVerification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."PhoneVerification"
    ADD CONSTRAINT "PhoneVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Placement Placement_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Placement"
    ADD CONSTRAINT "Placement_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Referral Referral_refereeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Referral Referral_referrerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Tenant Tenant_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."Tenant"
    ADD CONSTRAINT "Tenant_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: VatRate VatRate_objectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: app_user
--

ALTER TABLE ONLY public."VatRate"
    ADD CONSTRAINT "VatRate_objectId_fkey" FOREIGN KEY ("objectId") REFERENCES public."Object"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict rNXqN6lfvMuvHRUmM2xd1FVC5vEcKdqoxXkWXT2ECxdIupcwm6EjDnlTjPdvH0c


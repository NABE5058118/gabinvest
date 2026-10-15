import express from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { prisma } from './lib/prisma.js';
import objectsRouter from './routes/objects.js';
import citiesRouter from './routes/cities.js';
import leadsRouter from './routes/leads.js';
import favoritesRouter from './routes/favorites.js';
import adminRouter from './routes/admin.js';
import adminAuthRouter from './routes/admin-auth.js';
import authRouter from './routes/auth.js';
import attributionRouter from './routes/attribution.js';
import dealsRouter from './routes/deals.js';
import auditRouter from './routes/audit.js';
import commissionsRouter from './routes/commissions.js';
import { createLogger } from './utils/logger.js';
import { PrismaRateLimitStore } from './utils/prismaRateLimitStore.js';

dotenv.config();

const logger = createLogger('app');
const requestLogger = createLogger('http');
const isTest = process.env.NODE_ENV === 'test';

if (!isTest) {
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_JWT_SECRET', 'TELEGRAM_BOT_TOKEN', 'ADMIN_TOKEN'];
  const weakDefaults = new Set(['change-me-in-production', 'change-me-admin-in-production', 'admin123']);
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.fatal(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (!process.env.ALLOWED_ORIGINS?.split(',').map((origin) => origin.trim()).filter(Boolean).length) {
    logger.fatal('ALLOWED_ORIGINS must contain the exact allowed production origins');
    process.exit(1);
  }
  if (weakDefaults.has(process.env.JWT_SECRET || '')) {
    logger.fatal('JWT_SECRET uses a weak default value');
    process.exit(1);
  }
  if (weakDefaults.has(process.env.ADMIN_JWT_SECRET || '')) {
    logger.fatal('ADMIN_JWT_SECRET uses a weak default value');
    process.exit(1);
  }
  if (weakDefaults.has(process.env.ADMIN_TOKEN || '')) {
    logger.fatal('ADMIN_TOKEN uses a weak default value');
    process.exit(1);
  }
}

async function validateSchema() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t) => t.tablename);
    const requiredTables = [
      'User', 'Object', 'Favorite', 'Lead', 'CommercialOffer', 'Consent', 'Tenant', 'Lease', 'Expense',
      'LegalConstraint', 'EngineeringSpec', 'VatRate', 'Moderation', 'Placement', 'Payment', 'Attribution',
      'Deal', 'DealStageLog', 'Commission', 'AuditEvent', 'Chat', 'ChatMessage', 'PhoneVerification',
      'Referral', 'AntiBypassRule', 'PaymentProvider', 'Payout', 'RateLimitCounter',
    ];
    const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}. Run: npx prisma migrate deploy`);
    }

    const requiredColumns: Record<string, string[]> = {
      User: ['id', 'telegramId', 'phone', 'email', 'passwordHash', 'firstName', 'lastName', 'username'],
      Object: ['id', 'title', 'type', 'price', 'yieldPercent', 'location', 'city', 'area', 'createdAt'],
      Moderation: ['objectId', 'status'],
      Lead: ['id', 'objectId', 'userId', 'clientId', 'name', 'phone', 'status', 'createdAt'],
      Attribution: ['id', 'userId', 'telegramId', 'firstSeenAt'],
    };
    for (const [table, expectedColumns] of Object.entries(requiredColumns)) {
      const rows = await prisma.$queryRaw<{ column_name: string }[]>`
        SELECT column_name FROM information_schema.columns WHERE table_name = ${table} AND table_schema = 'public'
      `;
      const actual = new Set(rows.map((row) => row.column_name));
      const absent = expectedColumns.filter((column) => !actual.has(column));
      if (absent.length) throw new Error(`${table} table missing columns: ${absent.join(', ')}. Run: npx prisma migrate deploy`);
    }
    logger.info('Database schema validated successfully');
  } catch (error) {
    logger.fatal('Schema validation failed', error);
    process.exit(1);
  }
}

const app = express();
const PORT = Number(process.env.PORT || 3001);
app.set('trust proxy', 1);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.disable('x-powered-by');
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = req.headers['x-request-id']?.toString().slice(0, 100) || crypto.randomUUID();
  res.setHeader('X-Request-ID', requestId);
  const start = Date.now();
  if (req.path !== '/health') {
    requestLogger.info(`${req.method} ${req.path}`, { requestId, ip: req.ip, userAgent: req.headers['user-agent'] });
  }
  res.on('finish', () => {
    if (req.path === '/health') return;
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    requestLogger.log(level, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`, { requestId });
  });
  next();
});

app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || (isTest ? 'http://localhost:5173' : ''))
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
}));
app.use(compression());
app.use(express.json({ limit: '100kb' }));

function limiter(windowMs: number, max: number, namespace: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests',
    ...(isTest ? {} : { store: new PrismaRateLimitStore(namespace, windowMs) }),
  });
}

const authLimiter = limiter(15 * 60 * 1000, 20, 'auth');
const registerLimiter = limiter(60 * 60 * 1000, 10, 'register');
const telegramLimiter = limiter(60 * 1000, 20, 'telegram');
const leadsLimiter = limiter(60 * 1000, 10, 'leads');

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/telegram', telegramLimiter);
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/leads', leadsLimiter);

app.use('/api/objects', objectsRouter);
app.use('/api/cities', citiesRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/auth', authRouter);
app.use('/api/attribution', attributionRouter);
app.use('/api/deals', dealsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/commissions', commissionsRouter);

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

app.get('/uploads/:filename', (req, res) => {
  const filename = String(req.params.filename || '');
  const allowedName = /^[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif|pdf|pptx)$/i;
  if (!allowedName.test(filename) || path.basename(filename) !== filename || filename.includes('..')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const fullPath = path.resolve(uploadsDir, filename);
  if (!fullPath.startsWith(`${uploadsDir}${path.sep}`)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
    '.gif': 'image/gif', '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  res.setHeader('Content-Type', mimeTypes[ext]);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.sendFile(fullPath);
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const requestId = res.getHeader('X-Request-ID');
  logger.error('Unhandled error', {
    message: err?.message,
    url: req.path,
    method: req.method,
    ip: req.ip,
    requestId,
  });
  if (err?.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Not allowed by CORS', requestId });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'Request body too large', requestId });
    return;
  }
  res.status(500).json({ error: 'Internal server error', requestId });
});

export { app };

if (!isTest) {
  let server: ReturnType<typeof app.listen> | undefined;
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}; graceful shutdown started`);
    const forcedExit = setTimeout(() => {
      logger.error('Graceful shutdown timed out; forcing exit');
      process.exit(1);
    }, 15_000);
    forcedExit.unref();

    const disconnect = async () => {
      try {
        await prisma.$disconnect();
        clearTimeout(forcedExit);
        process.exit(0);
      } catch (error) {
        logger.error('Failed to disconnect Prisma during shutdown', error);
        clearTimeout(forcedExit);
        process.exit(1);
      }
    };

    if (!server) {
      void disconnect();
      return;
    }
    server.close((error) => {
      if (error) logger.error('HTTP server close failed', error);
      void disconnect();
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  void validateSchema().then(() => {
    if (shuttingDown) return;
    server = app.listen(PORT, () => logger.info(`Backend running on port ${PORT}`));
    server.requestTimeout = 30_000;
    server.headersTimeout = 35_000;
  });
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { prisma } from './lib/prisma.js';
import objectsRouter from './routes/objects.js';
import leadsRouter from './routes/leads.js';
import favoritesRouter from './routes/favorites.js';
import adminRouter from './routes/admin.js';
import adminAuthRouter from './routes/admin-auth.js';
import authRouter from './routes/auth.js';

dotenv.config();

if (process.env.NODE_ENV !== 'test') {
  const requiredEnv = ['DATABASE_URL', 'JWT_SECRET', 'ADMIN_JWT_SECRET', 'TELEGRAM_BOT_TOKEN'];
  const weakDefaults = new Set(['change-me-in-production', 'change-me-admin-in-production']);
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
  if (weakDefaults.has(process.env.JWT_SECRET || '')) {
    console.error('FATAL: JWT_SECRET uses a weak default value');
    process.exit(1);
  }
  if (weakDefaults.has(process.env.ADMIN_JWT_SECRET || '')) {
    console.error('FATAL: ADMIN_JWT_SECRET uses a weak default value');
    process.exit(1);
  }
  if (!process.env.ADMIN_TOKEN) {
    console.error('FATAL: ADMIN_TOKEN is not set');
    process.exit(1);
  }
}

async function validateSchema() {
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t: { tablename: string }) => t.tablename);

    const requiredTables = ['User', 'Object', 'Favorite', 'Lead', 'CommercialOffer', 'Consent'];
    const missingTables = requiredTables.filter((t) => !tableNames.includes(t));
    if (missingTables.length > 0) {
      console.error(`Missing tables: ${missingTables.join(', ')}. Run: npx prisma migrate deploy`);
      process.exit(1);
    }

    const userColumns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND table_schema = 'public'
    `;
    const userColumnNames = userColumns.map((c: { column_name: string }) => c.column_name);
    const requiredUserColumns = ['id', 'telegramId', 'phone', 'email', 'passwordHash', 'firstName', 'lastName', 'username'];
    const missingUserColumns = requiredUserColumns.filter((c) => !userColumnNames.includes(c));
    if (missingUserColumns.length > 0) {
      console.error(`User table missing columns: ${missingUserColumns.join(', ')}. Run: npx prisma migrate deploy`);
      process.exit(1);
    }

    console.log('Database schema validated successfully');
  } catch (error) {
    console.error('Schema validation failed:', error);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS') as any, false as any);
  }
}}));
app.use(express.json({ limit: '100kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Too many requests' });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Too many requests' });
const telegramLimiter = rateLimit({ windowMs: 60 * 1000, max: 20, message: 'Too many requests' });
const leadsLimiter = rateLimit({ windowMs: 60 * 1000, max: 5, message: 'Too many requests' });

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/auth/telegram', telegramLimiter);
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/leads', leadsLimiter);

app.use('/api/objects', objectsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/auth', adminAuthRouter);
app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({ error: 'Not allowed by CORS' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  validateSchema().then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  });
}

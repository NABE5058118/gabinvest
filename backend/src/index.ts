import express from 'express';
import cors from 'cors';
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

const requiredEnv = ['DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

async function validateSchema() {
  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t) => t.tablename);

    const requiredTables = ['User', 'Object', 'Favorite', 'Lead', 'CommercialOffer', 'Consent'];
    const missingTables = requiredTables.filter((t) => !tableNames.includes(t));
    if (missingTables.length > 0) {
      console.error(`Missing tables: ${missingTables.join(', ')}. Run: npx prisma migrate deploy`);
      process.exit(1);
    }

    const userColumns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND table_schema = 'public'
    `;
    const userColumnNames = userColumns.map((c) => c.column_name);
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

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

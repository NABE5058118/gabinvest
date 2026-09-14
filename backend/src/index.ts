import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import objectsRouter from './routes/objects.js';
import leadsRouter from './routes/leads.js';
import favoritesRouter from './routes/favorites.js';
import adminRouter from './routes/admin.js';
import authRouter from './routes/auth.js';

dotenv.config();

const requiredEnv = ['DATABASE_URL'];
const missing = requiredEnv.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
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
app.use('/api/auth', authRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

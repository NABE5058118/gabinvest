import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import objectsRouter from './routes/objects';
import leadsRouter from './routes/leads';
import favoritesRouter from './routes/favorites';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/objects', objectsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/favorites', favoritesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

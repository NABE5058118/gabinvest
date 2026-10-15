import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('prisma');
const slowQueryMs = Number(process.env.DATABASE_SLOW_QUERY_MS || 500);

export const prisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }],
});

prisma.$on('query', (event) => {
  if (event.duration >= slowQueryMs) {
    // Do not log SQL parameters: they may contain personal data.
    logger.warn('Slow database query', {
      durationMs: event.duration,
      query: event.query.slice(0, 500),
    });
  }
});

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.ts';

const router = Router();
const logger = createLogger('cities');

router.get('/', async (req: Request, res: Response) => {
  try {
    const cities = await prisma.object.findMany({
      where: { city: { not: null } },
      select: { city: true },
      orderBy: { city: 'asc' },
      distinct: ['city'],
    });

    const filtered = cities.map((c) => c.city).filter((city): city is string => city !== null);
    logger.info('Fetched cities', { count: filtered.length });
    res.json(filtered);
  } catch (error) {
    logger.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

export default router;

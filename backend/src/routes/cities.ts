import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const cities = await prisma.object.findMany({
      where: { city: { not: null } },
      select: { city: true },
      orderBy: { city: 'asc' },
      distinct: ['city'],
    });

    res.json(cities.map((c) => c.city).filter((city): city is string => city !== null));
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
const logger = createLogger('cases');

const caseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'price']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = caseQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid filters' });
    }

    const q = parsed.data;
    const where = { status: 'approved' };

    const [cases, total] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { [q.sortBy]: q.sortOrder } as any,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        include: {
          images: { orderBy: { sort: 'asc' } },
        },
      }),
      prisma.case.count({ where }),
    ]);

    res.json({
      cases,
      total,
      page: q.page,
      limit: q.limit,
      totalPages: Math.ceil(total / q.limit),
    });
  } catch (error) {
    logger.error('Error fetching cases:', error);
    res.status(500).json({ error: 'Failed to fetch cases' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const caseItem = await prisma.case.findFirst({
      where: { id: String(req.params.id), status: 'approved' },
      include: {
        images: { orderBy: { sort: 'asc' } },
      },
    });

    if (!caseItem) {
      return res.status(404).json({ error: 'Case not found' });
    }

    res.json(caseItem);
  } catch (error) {
    logger.error('Error fetching case:', error);
    res.status(500).json({ error: 'Failed to fetch case' });
  }
});

export default router;

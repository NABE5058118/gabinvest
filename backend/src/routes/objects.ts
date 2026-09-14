import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

const ITEMS_PER_PAGE = 20;

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const type = req.query.type as string | undefined;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
    const city = req.query.city as string | undefined;

    const minArea = req.query.minArea ? parseInt(req.query.minArea as string) : undefined;
    const maxArea = req.query.maxArea ? parseInt(req.query.maxArea as string) : undefined;
    const minYield = req.query.minYield ? parseFloat(req.query.minYield as string) : undefined;
    const maxYield = req.query.maxYield ? parseFloat(req.query.maxYield as string) : undefined;

    const where: any = {};

    if (type && type !== 'all') {
      where.type = type;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (minArea !== undefined || maxArea !== undefined) {
      where.area = {};
      if (minArea !== undefined) where.area.gte = minArea;
      if (maxArea !== undefined) where.area.lte = maxArea;
    }

    if (minYield !== undefined || maxYield !== undefined) {
      where.yieldPercent = {};
      if (minYield !== undefined) where.yieldPercent.gte = minYield;
      if (maxYield !== undefined) where.yieldPercent.lte = maxYield;
    }

    if (city) {
      where.city = city;
    }

    const [objects, total] = await Promise.all([
      prisma.object.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
      }),
      prisma.object.count({ where }),
    ]);

    res.json({
      objects,
      total,
      page,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    });
  } catch (error) {
    console.error('Error fetching objects:', error);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const object = await prisma.object.findUnique({
      where: { id: String(req.params.id) },
      include: { commercialOffer: true },
    });

    if (!object) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json(object);
  } catch (error) {
    console.error('Error fetching object:', error);
    res.status(500).json({ error: 'Failed to fetch object' });
  }
});

export default router;

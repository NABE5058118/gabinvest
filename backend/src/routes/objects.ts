import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('objects');

const ITEMS_PER_PAGE = 20;

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const type = req.query.type as string | undefined;
    const minPrice = req.query.minPrice ? parseInt(req.query.minPrice as string) : undefined;
    const maxPrice = req.query.maxPrice ? parseInt(req.query.maxPrice as string) : undefined;
    const city = req.query.city as string | undefined;
    const anchorTenant = req.query.anchorTenant as string | undefined;

    const minArea = req.query.minArea ? parseInt(req.query.minArea as string) : undefined;
    const maxArea = req.query.maxArea ? parseInt(req.query.maxArea as string) : undefined;
    const minYield = req.query.minYield ? parseFloat(req.query.minYield as string) : undefined;
    const maxYield = req.query.maxYield ? parseFloat(req.query.maxYield as string) : undefined;

    const leaseEndBefore = req.query.leaseEndBefore as string | undefined;
    const leaseEndAfter = req.query.leaseEndAfter as string | undefined;

    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc';

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

    if (anchorTenant) {
      where.OR = [
        { anchorTenantName: { contains: anchorTenant } },
        { tenants: { some: { name: { contains: anchorTenant } } } },
      ];
    }

    if (leaseEndBefore || leaseEndAfter) {
      where.leaseEndDate = {};
      if (leaseEndBefore) where.leaseEndDate.lte = new Date(leaseEndBefore);
      if (leaseEndAfter) where.leaseEndDate.gte = new Date(leaseEndAfter);
    }

    const allowedSortFields = ['createdAt', 'price', 'area', 'yieldPercent', 'leaseEndDate'];
    const orderBy: any = allowedSortFields.includes(sortBy)
      ? { [sortBy]: sortOrder }
      : { createdAt: 'desc' };

    const [objects, total] = await Promise.all([
      prisma.object.findMany({
        where,
        orderBy,
        skip: (page - 1) * ITEMS_PER_PAGE,
        take: ITEMS_PER_PAGE,
        include: {
          images: { orderBy: { sort: 'asc' } },
          tenants: true,
          expenses: true,
          legalConstraints: true,
          engineeringSpec: true,
          vatRate: true,
          moderation: true,
          placement: true,
          leases: { include: { tenant: true } },
        },
      }),
      prisma.object.count({ where }),
    ]);

    const rotationTimestamp = new Date().toISOString();

    res.json({
      objects,
      total,
      page,
      totalPages: Math.ceil(total / ITEMS_PER_PAGE),
      rotationTimestamp,
    });
  } catch (error) {
    logger.error('Error fetching objects:', error);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

router.get('/cities', async (req: Request, res: Response) => {
  try {
    const cities = await prisma.object.findMany({
      where: { city: { not: null } },
      select: { city: true },
      orderBy: { city: 'asc' },
      distinct: ['city'],
    });

    res.json(cities.map((c) => c.city).filter((city): city is string => city !== null));
  } catch (error) {
    logger.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

router.get('/anchor-tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { isAnchor: true },
      select: { name: true },
      distinct: ['name'],
      orderBy: { name: 'asc' },
    });

    res.json(tenants.map((t) => t.name));
  } catch (error) {
    logger.error('Error fetching anchor tenants:', error);
    res.status(500).json({ error: 'Failed to fetch anchor tenants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const object = await prisma.object.findUnique({
      where: { id: String(req.params.id) },
      include: {
        images: { orderBy: { sort: 'asc' } },
        tenants: true,
        expenses: true,
        legalConstraints: true,
        engineeringSpec: true,
        vatRate: true,
        moderation: true,
        placement: true,
        leases: { include: { tenant: true } },
        commercialOffer: true,
      },
    });

    if (!object) {
      return res.status(404).json({ error: 'Object not found' });
    }

    res.json(object);
  } catch (error) {
    logger.error('Error fetching object:', error);
    res.status(500).json({ error: 'Failed to fetch object' });
  }
});

export default router;

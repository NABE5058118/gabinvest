import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = Router();
const logger = createLogger('objects');

const DEFAULT_ITEMS_PER_PAGE = 20;
const MAX_ITEMS_PER_PAGE = 100;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(MAX_ITEMS_PER_PAGE, Math.max(1, parseInt(req.query.limit as string) || DEFAULT_ITEMS_PER_PAGE));
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
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: { orderBy: { sort: 'asc' } },
          tenants: true,
        },
      }),
      prisma.object.count({ where }),
    ]);

    const rotationTimestamp = new Date().toISOString();

    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.json({
      objects,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
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
      orderBy: { name: 'asc' },
      distinct: ['name'],
    });

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
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

    res.set('Cache-Control', 'public, max-age=120, stale-while-revalidate=30');
    res.json(object);
  } catch (error) {
    logger.error('Error fetching object:', error);
    res.status(500).json({ error: 'Failed to fetch object' });
  }
});

router.get('/:id/offer/download', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.findUnique({
      where: { id },
      select: {
        id: true,
        offerFileUrl: true,
        offerFileName: true,
        offerFileType: true,
      },
    });

    if (!obj || !obj.offerFileUrl) {
      return res.status(404).json({ error: 'Offer not found' });
    }

    const basename = path.basename(obj.offerFileUrl);
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(basename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(uploadsDir, basename);

    const rawName = obj.offerFileName || 'offer.pdf';
    const decodedName = rawName
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .slice(0, 200) || 'offer.pdf';

    const encodedName = encodeURIComponent(decodedName)
      .replace(/[!'()*~]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="fallback.pdf"; filename*=UTF-8''${encodedName}`
    );

    if (obj.offerFileType) {
      res.setHeader('Content-Type', obj.offerFileType);
    }

    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error downloading offer:', error);
    res.status(500).json({ error: 'Failed to download offer' });
  }
});

export default router;

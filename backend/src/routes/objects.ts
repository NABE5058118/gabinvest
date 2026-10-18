import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.js';
import { normalizeOfferFileName } from '../utils/filename.js';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { withCache } from '../utils/cache.js';
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

const catalogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1_000_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_ITEMS_PER_PAGE).default(DEFAULT_ITEMS_PER_PAGE),
  types: z.preprocess(
    (v) => (Array.isArray(v) ? v : v === undefined ? undefined : [v]),
    z.array(z.string().max(80)).optional(),
  ),
  minPrice: z.coerce.number().finite().int().min(0).max(2_147_483_647).optional(),
  maxPrice: z.coerce.number().finite().int().min(0).max(2_147_483_647).optional(),
  city: z.string().max(120).optional(),
  anchorTenant: z.string().max(120).optional(),
  minArea: z.coerce.number().finite().int().min(0).max(1_000_000).optional(),
  maxArea: z.coerce.number().finite().int().min(0).max(1_000_000).optional(),
  minYield: z.coerce.number().finite().min(0).max(100).optional(),
  maxYield: z.coerce.number().finite().min(0).max(100).optional(),
  leaseEndBefore: z.string().max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid leaseEndBefore').optional(),
  leaseEndAfter: z.string().max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid leaseEndAfter').optional(),
  sortBy: z.enum(['createdAt', 'price', 'area', 'yieldPercent', 'leaseEndDate']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
}).refine((q) => q.minPrice === undefined || q.maxPrice === undefined || q.minPrice <= q.maxPrice, {
  message: 'minPrice must be less than or equal to maxPrice',
}).refine((q) => q.minArea === undefined || q.maxArea === undefined || q.minArea <= q.maxArea, {
  message: 'minArea must be less than or equal to maxArea',
}).refine((q) => q.minYield === undefined || q.maxYield === undefined || q.minYield <= q.maxYield, {
  message: 'minYield must be less than or equal to maxYield',
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = catalogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid catalog filters' });
    }

    const q = parsed.data;
    const where: any = { moderation: { is: { status: 'approved' } } };
    if (q.types && q.types.length > 0) {
      where.type = { in: q.types };
    }
    if (q.minPrice !== undefined || q.maxPrice !== undefined) {
      where.price = {};
      if (q.minPrice !== undefined) where.price.gte = q.minPrice;
      if (q.maxPrice !== undefined) where.price.lte = q.maxPrice;
    }
    if (q.minArea !== undefined || q.maxArea !== undefined) {
      where.area = {};
      if (q.minArea !== undefined) where.area.gte = q.minArea;
      if (q.maxArea !== undefined) where.area.lte = q.maxArea;
    }
    if (q.minYield !== undefined || q.maxYield !== undefined) {
      where.yieldPercent = {};
      if (q.minYield !== undefined) where.yieldPercent.gte = q.minYield;
      if (q.maxYield !== undefined) where.yieldPercent.lte = q.maxYield;
    }
    if (q.city) where.city = q.city;
    if (q.anchorTenant) {
      where.OR = [
        { anchorTenantName: { contains: q.anchorTenant, mode: 'insensitive' } },
        { tenants: { some: { name: { contains: q.anchorTenant, mode: 'insensitive' } } } },
      ];
    }
    if (q.leaseEndBefore || q.leaseEndAfter) {
      where.leaseEndDate = {};
      if (q.leaseEndBefore) where.leaseEndDate.lte = new Date(q.leaseEndBefore);
      if (q.leaseEndAfter) where.leaseEndDate.gte = new Date(q.leaseEndAfter);
    }

    const cacheKey = `catalog:${JSON.stringify(q)}`;
    const payload = await withCache(cacheKey, 30_000, async () => {
      const [objects, total] = await Promise.all([
        prisma.object.findMany({
          where,
          orderBy: { [q.sortBy]: q.sortOrder } as any,
          skip: (q.page - 1) * q.limit,
          take: q.limit,
          include: {
            images: { orderBy: { sort: 'asc' } },
            tenants: true,
            moderation: { select: { status: true } },
          },
        }),
        prisma.object.count({ where }),
      ]);
      return {
        objects,
        total,
        page: q.page,
        limit: q.limit,
        totalPages: Math.ceil(total / q.limit),
        rotationTimestamp: new Date().toISOString(),
      };
    });

    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
    res.json(payload);
  } catch (error) {
    logger.error('Error fetching objects:', error);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

router.get('/cities', async (req: Request, res: Response) => {
  try {
    const cities = await withCache('cities:public', 300_000, () => prisma.object.findMany({
      where: { city: { not: null }, moderation: { is: { status: 'approved' } } },
      select: { city: true },
      orderBy: { city: 'asc' },
      distinct: ['city'],
    }));

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json(cities.map((c) => c.city).filter((city): city is string => city !== null));
  } catch (error) {
    logger.error('Error fetching cities:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

router.get('/anchor-tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await withCache('anchor-tenants:public', 300_000, () => prisma.tenant.findMany({
      where: { isAnchor: true, object: { moderation: { is: { status: 'approved' } } } },
      select: { name: true },
      orderBy: { name: 'asc' },
      distinct: ['name'],
    }));

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json(tenants.map((t) => t.name));
  } catch (error) {
    logger.error('Error fetching anchor tenants:', error);
    res.status(500).json({ error: 'Failed to fetch anchor tenants' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const object = await prisma.object.findFirst({
      where: { id: String(req.params.id), moderation: { is: { status: 'approved' } } },
      include: {
        images: { orderBy: { sort: 'asc' } },
        tenants: true,
        expenses: true,
        legalConstraints: true,
        engineeringSpec: true,
        vatRate: true,
        moderation: { select: { status: true } },
        placement: { select: { id: true, type: true, isExclusive: true, createdAt: true, updatedAt: true } },
        leases: { include: { tenant: true } },
        commercialOffer: true,
      },
    });

    if (!object) {
      return res.status(404).json({ error: 'Object not found' });
    }

    if (object.offerFileName) {
      object.offerFileName = normalizeOfferFileName(object.offerFileName);
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

    const normalizedName = normalizeOfferFileName(rawName);

    const encodedName = encodeURIComponent(normalizedName)
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

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { processImage } from '../utils/imageProcessor.js';
import { normalizeOfferFileName } from '../utils/filename.js';
import { matchesBotSyncSecret } from '../lib/botSync.js';
import { sendBotWebhook } from '../lib/botWebhook.js';
import { adminAuthMiddleware } from '../middleware/jwt.js';
const requireAdmin = adminAuthMiddleware;

const router = Router();
const logger = createLogger('admin');

async function notifyBotOfObject(objectId: string, object: { title: string; location: string; price: number; priceIndicator?: string | null; image?: string | null }): Promise<void> {
  try {
    const status = await sendBotWebhook(
      'object',
      { objectId, ...object },
      15000
    );
    if (status === null) return;
    logger.info('Bot object notify sent', { objectId, status });
  } catch (err: any) {
    logger.warn('Bot object notify failed', { objectId, status: err?.response?.status, message: err?.message });
    // Don't throw - notification failure should not block object creation
  }
}

/**
 * After an image is uploaded, ensure `object.image` points at it and notify the bot.
 * The bot delivers the photo in the new-object notification; calling it here (after
 * the image exists) guarantees the webhook payload carries a usable image URL.
 *
 * Only notifies when the object had no main image before the upload, so re-uploading
 * images on an existing object does not trigger a duplicate notification.
 */
async function maybeNotifyObjectImage(objectId: string): Promise<void> {
  try {
    const obj = await prisma.object.findUnique({
      where: { id: objectId },
      select: { id: true, title: true, location: true, price: true, priceIndicator: true, image: true },
    });
    if (!obj) return;

    // Re-upload on an already-published object: do not re-notify subscribers.
    if (obj.image) return;

    const firstImage = await prisma.objectImage.findFirst({
      where: { objectId },
      orderBy: { sort: 'asc' },
    });
    if (!firstImage) return;

    await prisma.object.update({
      where: { id: objectId },
      data: { image: firstImage.url },
    });

    await notifyBotOfObject(obj.id, {
      title: obj.title,
      location: obj.location,
      price: obj.price,
      priceIndicator: obj.priceIndicator,
      image: firstImage.url,
    });
  } catch (err: any) {
    logger.warn('Object image notify failed', { objectId, err: err?.message });
  }
}

declare global { namespace Express { interface Request { adminActor?: string } } }

const objectTypeEnum = ['Офис', 'Склад', 'Торговое помещение', 'Другое'] as const;
type ObjectType = typeof objectTypeEnum[number];

const priceIndicatorEnum = ['below_market', 'market', 'above_market'] as const;
type PriceIndicator = typeof priceIndicatorEnum[number];

const placementTypeEnum = ['standard', 'paid', 'exclusive'] as const;
type PlacementType = typeof placementTypeEnum[number];

const moderationStatusEnum = ['pending', 'approved', 'rejected'] as const;
type ModerationStatus = typeof moderationStatusEnum[number];

const objectBaseSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(objectTypeEnum),
  price: z.coerce.number().int().positive().max(2_147_483_647, 'Цена слишком большая'),
  yieldPercent: z.coerce.number().min(0).max(100),
  location: z.string().min(1).max(300),
  city: z.string().max(100).nullable().optional(),
  area: z.coerce.number().int().positive().max(1_000_000, 'Площадь слишком большая'),
  monthlyRent: z.coerce.number().int().positive().nullable().optional(),
  annualRevenue: z.coerce.number().int().positive().nullable().optional(),
  leaseStartDate: z.preprocess(
    (val: unknown) => {
      if (val === null || val === undefined || val === '') return null;
      const date = new Date(val as string | number | Date);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    z.date().nullable().optional(),
  ),
  leaseEndDate: z.preprocess(
    (val: unknown) => {
      if (val === null || val === undefined || val === '') return null;
      const date = new Date(val as string | number | Date);
      return Number.isNaN(date.getTime()) ? null : date;
    },
    z.date().nullable().optional(),
  ),
  anchorTenantName: z.string().max(200).nullable().optional(),
  priceIndicator: z.enum(priceIndicatorEnum).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  image: z.string().nullable().optional(),
});

const createObjectSchema = objectBaseSchema.refine(
  (data) =>
    !data.leaseStartDate || !data.leaseEndDate || data.leaseStartDate <= data.leaseEndDate,
  { path: ['leaseStartDate'], message: 'Дата начала аренды не может быть позже даты окончания' },
);

const updateObjectSchema = objectBaseSchema.partial().refine(
  (data) =>
    !data.leaseStartDate || !data.leaseEndDate || data.leaseStartDate <= data.leaseEndDate,
  { path: ['leaseStartDate'], message: 'Дата начала аренды не может быть позже даты окончания' },
);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const IMAGE_MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
};

function normalizeMime(mime: string): string {
  return IMAGE_MIME_ALIASES[mime] || mime;
}

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
]);

async function verifyFileType(filePath: string, expectedMime: string): Promise<boolean> {
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type) return false;
    return normalizeMime(type.mime) === normalizeMime(expectedMime);
  } catch {
    // Failure to inspect file bytes is a hard rejection, never a successful type check.
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.pdf', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file extension'), '');
    }
    const unique = crypto.randomUUID();
    cb(null, unique + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/jpg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const unique = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, unique + ext);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const bulkImageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

router.get('/objects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Math.min(1_000_000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
    const objects = await prisma.object.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { select: { id: true, url: true, sort: true } },
        moderation: { select: { id: true, status: true } },
      },
    });
    res.json(objects);
  } catch (error) {
    logger.error('Error fetching admin objects:', error);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

router.get('/objects/:id', requireAdminOrBot, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.findUnique({
      where: { id },
      include: {
        images: true,
        tenants: true,
        expenses: true,
        legalConstraints: true,
        engineeringSpec: true,
        vatRate: true,
        moderation: true,
        placement: true,
        leases: { include: { tenant: true } },
      },
    });
    if (!obj) {
      return res.status(404).json({ error: 'Object not found' });
    }
    res.json(obj);
  } catch (error) {
    logger.error('Error fetching object:', error);
    res.status(500).json({ error: 'Failed to fetch object' });
  }
});

router.post('/objects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createObjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const data = parsed.data;
    const price = Math.min(Number(data.price), 2_147_483_647);
    const area = Math.min(Number(data.area), 1_000_000);

    const obj = await prisma.object.create({
      data: {
        title: data.title,
        type: data.type,
        price,
        yieldPercent: data.yieldPercent,
        location: data.location,
        city: data.city || null,
        area,
        monthlyRent: data.monthlyRent || null,
        annualRevenue: data.annualRevenue || null,
        leaseStartDate: data.leaseStartDate || null,
        leaseEndDate: data.leaseEndDate || null,
        anchorTenantName: data.anchorTenantName || null,
        priceIndicator: data.priceIndicator || null,
        description: data.description || null,
        image: data.image || null,
        moderation: { create: { status: 'pending' } },
        placement: { create: { type: 'standard' } },
      },
    });
    res.status(201).json(obj);
  } catch (error) {
    logger.error('Error creating object:', error);
    res.status(500).json({ error: 'Failed to create object' });
  }
});

router.put('/objects/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = updateObjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const data = parsed.data;
    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.yieldPercent !== undefined) updateData.yieldPercent = data.yieldPercent;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.area !== undefined) updateData.area = data.area;
    if (data.monthlyRent !== undefined) updateData.monthlyRent = data.monthlyRent;
    if (data.annualRevenue !== undefined) updateData.annualRevenue = data.annualRevenue;
    if (data.leaseStartDate !== undefined) updateData.leaseStartDate = data.leaseStartDate;
    if (data.leaseEndDate !== undefined) updateData.leaseEndDate = data.leaseEndDate;
    if (data.anchorTenantName !== undefined) updateData.anchorTenantName = data.anchorTenantName;
    if (data.priceIndicator !== undefined) updateData.priceIndicator = data.priceIndicator;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.image !== undefined) updateData.image = data.image;

    const obj = await prisma.object.update({
      where: { id },
      data: updateData,
    });
    res.json(obj);
  } catch (error) {
    logger.error('Error updating object:', error);
    res.status(500).json({ error: 'Failed to update object' });
  }
});

router.delete('/objects/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.findUnique({
      where: { id },
      select: { offerFileUrl: true, image: true },
    });

    await prisma.object.delete({ where: { id } });

    if (obj) {
      [obj.offerFileUrl, obj.image].forEach((filePath) => {
        if (!filePath) return;
        try {
          const filename = path.basename(filePath);
          const fullPath = path.join(uploadsDir, filename);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        } catch (fileError: any) {
          if (fileError?.code !== 'EACCES') {
            throw fileError;
          }
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting object:', error);
    res.status(500).json({ error: 'Failed to delete object' });
  }
});

router.post(
  '/objects/:id/offer',
  requireAdmin,
  upload.single('offer'),
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const expectedMime = file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        : file.mimetype;
      const isValid = await verifyFileType(file.path, expectedMime);
      if (!isValid) {
        try {
          fs.unlinkSync(file.path);
        } catch (fileError: any) {
          if (fileError?.code !== 'EACCES') {
            throw fileError;
          }
        }
        return res.status(400).json({ error: 'Invalid file content' });
      }

      const fileUrl = `/uploads/${file.filename}`;

      const obj = await prisma.object.findUnique({ where: { id } });
      if (!obj) {
        return res.status(404).json({ error: 'Object not found' });
      }

      const updated = await prisma.object.update({
        where: { id },
        data: {
          offerFileUrl: fileUrl,
          offerFileName: normalizeOfferFileName(file.originalname),
          offerFileType: file.mimetype,
        },
      });

      res.json(updated);
    } catch (error) {
      logger.error('Error uploading offer:', error);
      res.status(500).json({ error: 'Failed to upload offer' });
    }
  }
);

router.get('/objects/:id/offer', requireAdmin, async (req: Request, res: Response) => {
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

    res.json({
      fileUrl: obj.offerFileUrl,
      fileName: obj.offerFileName,
      fileType: obj.offerFileType,
    });
  } catch (error) {
    logger.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

router.get('/objects/:id/offer/download', requireAdmin, async (req: Request, res: Response) => {
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

router.post('/objects/:id/image', requireAdmin, imageUpload.single('image'), async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const isValid = await verifyFileType(file.path, file.mimetype);
      if (!isValid) {
        try {
          fs.unlinkSync(file.path);
        } catch (fileError: any) {
          if (fileError?.code !== 'EACCES') {
            throw fileError;
          }
        }
        return res.status(400).json({ error: 'Invalid image content' });
      }

      const processedPath = await processImage(file.path);
      const imageUrl = `/uploads/${path.basename(processedPath)}`;

      const obj = await prisma.object.update({
        where: { id },
        data: { image: imageUrl },
      });

      res.json(obj);
    } catch (error: any) {
      logger.error('Error uploading image:', error);
      const message = error?.code === 'EACCES'
        ? 'Нет прав на запись в папку загрузок'
        : 'Failed to upload image';
      res.status(500).json({ error: message });
    }
  }
);

router.delete('/objects/:id/image', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.findUnique({
      where: { id },
      select: { image: true },
    });

    const filename = obj?.image ? path.basename(obj.image) : null;

    await prisma.object.update({
      where: { id },
      data: { image: null },
    });

    if (filename) {
      try {
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } catch (fileError: any) {
        if (fileError?.code !== 'EACCES') {
          throw fileError;
        }
      }
    }

    res.json(obj || {});
  } catch (error) {
    logger.error('Error removing image:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
});

router.post('/objects/:id/images', requireAdmin, imageUpload.single('image'), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

      const isValid = await verifyFileType(file.path, file.mimetype);
      if (!isValid) {
        try {
          fs.unlinkSync(file.path);
        } catch (fileError: any) {
          if (fileError?.code !== 'EACCES') {
            throw fileError;
          }
        }
        return res.status(400).json({ error: 'Invalid image content' });
      }

      const processedPath = await processImage(file.path);
      const imageUrl = `/uploads/${path.basename(processedPath)}`;

      const img = await prisma.objectImage.create({
        data: {
          objectId: id,
          url: imageUrl,
        },
      });

      await maybeNotifyObjectImage(id);

      res.status(201).json(img);
  } catch (error: any) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.post('/objects/:id/images/bulk', requireAdmin, bulkImageUpload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Files are required' });
    }

    for (const file of files) {
      const isValid = await verifyFileType(file.path, file.mimetype);
      if (!isValid) {
        for (const f of files) {
          try {
            fs.unlinkSync(f.path);
          } catch (fileError: any) {
            if (fileError?.code !== 'EACCES') {
              throw fileError;
            }
          }
        }
        return res.status(400).json({ error: 'Invalid image content' });
      }
    }

    const processed = await Promise.all(files.map((file) => processImage(file.path)));

    const created = await prisma.$transaction(
      processed.map((processedPath) =>
        prisma.objectImage.create({
          data: {
            objectId: id,
            url: `/uploads/${path.basename(processedPath)}`,
          },
        })
      )
    );

    if (created.length > 0) {
      await maybeNotifyObjectImage(id);
    }

    res.status(201).json(created);
  } catch (error: any) {
    logger.error('Error uploading images in bulk:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

router.delete('/objects/:id/images/:imageId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const imageId = String(req.params.imageId);

    const img = await prisma.objectImage.findUnique({
      where: { id: imageId },
    });

    if (!img || img.objectId !== id) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const filename = path.basename(img.url);

    await prisma.objectImage.delete({ where: { id: imageId } });

    try {
      const fullPath = path.join(uploadsDir, filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (fileError: any) {
      if (fileError?.code !== 'EACCES') {
        throw fileError;
      }
    }

    res.status(204).send();
  } catch (error) {
    logger.error('Error removing image:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
});

function allowBotSync(req: Request): boolean {
  const supplied = req.get('x-bot-sync-secret') || '';
  return matchesBotSyncSecret(supplied);
}

function requireAdminOrBot(req: Request, res: Response, next: NextFunction) {
  if (allowBotSync(req)) {
    next();
    return;
  }
  void adminAuthMiddleware(req, res, next);
}

router.get('/users/notify-subscribers', requireAdminOrBot, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { notifyNewObjects: true, telegramId: { not: null } },
      select: { telegramId: true },
    });
    res.json(users.map((u) => ({ telegramId: u.telegramId })));
  } catch (error) {
    logger.error('Error fetching notify subscribers:', error);
    res.status(500).json({ error: 'Failed to fetch subscribers' });
  }
});

router.get('/objects/:id/tenants', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenants = await prisma.tenant.findMany({
      where: { objectId: id },
      include: { leases: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(tenants);
  } catch (error) {
    logger.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

    router.post('/objects/:id/tenants', requireAdmin, async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { name, isAnchor, category } = req.body;

      const tenant = await prisma.tenant.create({
        data: {
          objectId: id,
          name,
          isAnchor: Boolean(isAnchor),
          category: category || null,
        },
      });

      res.status(201).json(tenant);
    } catch (error) {
      logger.error('Error creating tenant:', error);
      res.status(500).json({ error: 'Failed to create tenant' });
    }
  }
);

router.delete('/objects/:id/tenants/:tenantId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const tenantId = String(req.params.tenantId);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant || tenant.objectId !== id) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    await prisma.tenant.delete({ where: { id: tenantId } });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting tenant:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

router.get('/objects/:id/leases', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const leases = await prisma.lease.findMany({
      where: { objectId: id },
      include: { tenant: true },
      orderBy: { endDate: 'asc' },
    });
    res.json(leases);
  } catch (error) {
    logger.error('Error fetching leases:', error);
    res.status(500).json({ error: 'Failed to fetch leases' });
  }
});

router.post('/objects/:id/leases', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { tenantId, startDate, endDate, monthlyRent, isFixed, percentOfTurnover, indexationPercent } = req.body;

    const lease = await prisma.lease.create({
      data: {
        objectId: id,
        tenantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        monthlyRent: Number(monthlyRent),
        isFixed: Boolean(isFixed),
        percentOfTurnover: percentOfTurnover ? Number(percentOfTurnover) : null,
        indexationPercent: indexationPercent ? Number(indexationPercent) : null,
      },
      include: { tenant: true },
    });

    res.status(201).json(lease);
  } catch (error) {
    logger.error('Error creating lease:', error);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

router.delete('/objects/:id/leases/:leaseId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const leaseId = String(req.params.leaseId);

    const lease = await prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease || lease.objectId !== id) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    await prisma.lease.delete({ where: { id: leaseId } });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting lease:', error);
    res.status(500).json({ error: 'Failed to delete lease' });
  }
});

router.get('/objects/:id/expenses', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const expenses = await prisma.expense.findMany({
      where: { objectId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    logger.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.post('/objects/:id/expenses', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, amount, compensatedByTenant, ownerOnly, note } = req.body;

    const expense = await prisma.expense.create({
      data: {
        objectId: id,
        name,
        amount: Number(amount),
        compensatedByTenant: Boolean(compensatedByTenant),
        ownerOnly: Boolean(ownerOnly),
        note: note || null,
      },
    });

    res.status(201).json(expense);
  } catch (error) {
    logger.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.delete('/objects/:id/expenses/:expenseId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const expenseId = String(req.params.expenseId);

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.objectId !== id) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    await prisma.expense.delete({ where: { id: expenseId } });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

router.get('/objects/:id/legal-constraints', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const constraints = await prisma.legalConstraint.findMany({
      where: { objectId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(constraints);
  } catch (error) {
    logger.error('Error fetching legal constraints:', error);
    res.status(500).json({ error: 'Failed to fetch legal constraints' });
  }
});

router.post('/objects/:id/legal-constraints', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { type, description } = req.body;

    const constraint = await prisma.legalConstraint.create({
      data: {
        objectId: id,
        type,
        description,
      },
    });

    res.status(201).json(constraint);
  } catch (error) {
    logger.error('Error creating legal constraint:', error);
    res.status(500).json({ error: 'Failed to create legal constraint' });
  }
});

router.delete('/objects/:id/legal-constraints/:constraintId', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const constraintId = String(req.params.constraintId);

    const constraint = await prisma.legalConstraint.findUnique({
      where: { id: constraintId },
    });

    if (!constraint || constraint.objectId !== id) {
      return res.status(404).json({ error: 'Legal constraint not found' });
    }

    await prisma.legalConstraint.delete({ where: { id: constraintId } });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting legal constraint:', error);
    res.status(500).json({ error: 'Failed to delete legal constraint' });
  }
});

router.get('/objects/:id/engineering', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const spec = await prisma.engineeringSpec.findUnique({
      where: { objectId: id },
    });

    if (!spec) {
      return res.status(404).json({ error: 'Engineering spec not found' });
    }

    res.json(spec);
  } catch (error) {
    logger.error('Error fetching engineering spec:', error);
    res.status(500).json({ error: 'Failed to fetch engineering spec' });
  }
});

router.post('/objects/:id/engineering', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { electricityKw, waterParams, gasParams } = req.body;

    const spec = await prisma.engineeringSpec.upsert({
      where: { objectId: id },
      update: {
        electricityKw: electricityKw || null,
        waterParams: waterParams || null,
        gasParams: gasParams || null,
      },
      create: {
        objectId: id,
        electricityKw: electricityKw || null,
        waterParams: waterParams || null,
        gasParams: gasParams || null,
      },
    });

    res.json(spec);
  } catch (error) {
    logger.error('Error saving engineering spec:', error);
    res.status(500).json({ error: 'Failed to save engineering spec' });
  }
});

router.get('/objects/:id/vat', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const vat = await prisma.vatRate.findUnique({
      where: { objectId: id },
    });

    if (!vat) {
      return res.status(404).json({ error: 'VAT rate not found' });
    }

    res.json(vat);
  } catch (error) {
    logger.error('Error fetching VAT rate:', error);
    res.status(500).json({ error: 'Failed to fetch VAT rate' });
  }
});

router.post('/objects/:id/vat', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { rate, note } = req.body;

    const vat = await prisma.vatRate.upsert({
      where: { objectId: id },
      update: {
        rate: Number(rate),
        note: note || null,
      },
      create: {
        objectId: id,
        rate: Number(rate),
        note: note || null,
      },
    });

    res.json(vat);
  } catch (error) {
    logger.error('Error saving VAT rate:', error);
    res.status(500).json({ error: 'Failed to save VAT rate' });
  }
});

router.get('/objects/:id/moderation', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const moderation = await prisma.moderation.findUnique({
      where: { objectId: id },
    });

    if (!moderation) {
      return res.status(404).json({ error: 'Moderation not found' });
    }

    res.json(moderation);
  } catch (error) {
    logger.error('Error fetching moderation:', error);
    res.status(500).json({ error: 'Failed to fetch moderation' });
  }
});

router.patch('/objects/:id/moderation', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = z.object({ status: z.enum(moderationStatusEnum), note: z.string().max(2000).optional().nullable() }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid moderation status' });
    const { status, note } = parsed.data;

    const moderation = await prisma.moderation.upsert({
      where: { objectId: id },
      update: {
        status: status as ModerationStatus,
        note: note || null,
        moderatedAt: new Date(),
        moderatedBy: req.adminActor || 'admin',
      },
      create: {
        objectId: id,
        status: status as ModerationStatus,
        note: note || null,
        moderatedAt: new Date(),
        moderatedBy: req.adminActor || 'admin',
      },
    });

    res.json(moderation);
  } catch (error) {
    logger.error('Error updating moderation:', error);
    res.status(500).json({ error: 'Failed to update moderation' });
  }
});

router.get('/objects/:id/placement', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const placement = await prisma.placement.findUnique({
      where: { objectId: id },
    });

    if (!placement) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json(placement);
  } catch (error) {
    logger.error('Error fetching placement:', error);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
});

router.patch('/objects/:id/placement', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { type, price, isExclusive } = req.body;

    const placement = await prisma.placement.upsert({
      where: { objectId: id },
      update: {
        type: type as PlacementType,
        price: price ? Number(price) : null,
        isExclusive: Boolean(isExclusive),
      },
      create: {
        objectId: id,
        type: type as PlacementType,
        price: price ? Number(price) : null,
        isExclusive: Boolean(isExclusive),
      },
    });

    res.json(placement);
  } catch (error) {
    logger.error('Error updating placement:', error);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

router.get('/objects/:id/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const payments = await prisma.payment.findMany({
      where: { objectId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    logger.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

router.post('/objects/:id/payments', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { amount, currency, method, status, paidAt } = req.body;

    const payment = await prisma.payment.create({
      data: {
        objectId: id,
        amount: Number(amount),
        currency: currency || 'RUB',
        method: method || null,
        status: status || 'pending',
        paidAt: paidAt ? new Date(paidAt) : null,
      },
    });

    res.status(201).json(payment);
  } catch (error) {
    logger.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

router.get('/moderation/queue', requireAdmin, async (req: Request, res: Response) => {
  try {
    const statusParam = String(req.query.status || 'pending');
    if (statusParam !== 'all' && !moderationStatusEnum.includes(statusParam as ModerationStatus)) {
      return res.status(400).json({ error: 'Invalid moderation status' });
    }
    const page = Math.max(1, Math.min(1_000_000, Number.parseInt(String(req.query.page || '1'), 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(String(req.query.limit || '50'), 10) || 50));
    const where: any = {};
    if (statusParam !== 'all') where.status = statusParam as ModerationStatus;
    const moderations = await prisma.moderation.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        object: {
          select: { id: true, title: true, type: true, price: true, location: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(moderations);
  } catch (error) {
    logger.error('Error fetching moderation queue:', error);
    res.status(500).json({ error: 'Failed to fetch moderation queue' });
  }
});

export { adminAuthMiddleware as requireAdmin };
export default router;

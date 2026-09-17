import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { fileTypeFromFile } from 'file-type';
import { z } from 'zod';

const router = Router();

const objectTypeEnum = ['Офис', 'Склад', 'Торговое помещение', 'Другое'] as const;
type ObjectType = typeof objectTypeEnum[number];

const createObjectSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.enum(objectTypeEnum),
  price: z.coerce.number().int().positive(),
  yieldPercent: z.coerce.number().min(0).max(100),
  location: z.string().min(1).max(300),
  city: z.string().max(100).nullable().optional(),
  area: z.coerce.number().int().positive(),
  roi: z.coerce.number().min(0).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  image: z.string().url().nullable().optional(),
});

const updateObjectSchema = createObjectSchema.partial();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

async function verifyFileType(filePath: string, expectedMime: string): Promise<boolean> {
  try {
    const type = await fileTypeFromFile(filePath);
    if (!type) return false;
    return type.mime === expectedMime;
  } catch {
    return false;
  }
}

function requireAdmin(req: Request, res: Response, next: Function) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, ADMIN_JWT_SECRET!, { algorithms: ['HS256'] }) as { role?: string };
      if (payload.role !== 'admin') {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      next();
      return;
    } catch {
      // fall through to token check
    }
  }

  const token = req.headers['x-admin-token'];
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    if (!allowedExts.includes(ext)) {
      return cb(new Error('Invalid file extension'), '');
    }
    const unique = crypto.randomUUID();
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

router.get('/objects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const objects = await prisma.object.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(objects);
  } catch (error) {
    console.error('Error fetching admin objects:', error);
    res.status(500).json({ error: 'Failed to fetch objects' });
  }
});

router.post('/objects', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createObjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const data = parsed.data;
    const obj = await prisma.object.create({
      data: {
        title: data.title,
        type: data.type,
        price: data.price,
        yieldPercent: data.yieldPercent,
        location: data.location,
        city: data.city || null,
        area: data.area,
        roi: data.roi || null,
        description: data.description || null,
        image: data.image || null,
      },
    });
    res.status(201).json(obj);
  } catch (error) {
    console.error('Error creating object:', error);
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
    const obj = await prisma.object.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        price: data.price,
        yieldPercent: data.yieldPercent,
        location: data.location,
        city: data.city || null,
        area: data.area,
        roi: data.roi || null,
        description: data.description || null,
        image: data.image || null,
      },
    });
    res.json(obj);
  } catch (error) {
    console.error('Error updating object:', error);
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
        if (filePath) {
          const filename = path.basename(filePath);
          const fullPath = path.join(uploadsDir, filename);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting object:', error);
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
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: 'Invalid file content' });
      }

      const fileUrl = `/uploads/${file.filename}`;

      const obj = await prisma.object.update({
        where: { id },
        data: {
          offerFileUrl: fileUrl,
          offerFileName: file.originalname,
          offerFileType: file.mimetype,
        },
      });

      res.json(obj);
    } catch (error) {
      console.error('Error uploading offer:', error);
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
    console.error('Error fetching offer:', error);
    res.status(500).json({ error: 'Failed to fetch offer' });
  }
});

router.get('/objects/:id/offer/download', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.findUnique({
      where: { id },
      select: {
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
    const safeName = path.basename(obj.offerFileName || 'offer.pdf').replace(/[^\w\-\.А-Яа-яЁё ]+/g, '').slice(0, 200) || 'offer.pdf';
    res.download(filePath, safeName);
  } catch (error) {
    console.error('Error downloading offer:', error);
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
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Invalid image content' });
    }

    const imageUrl = `/uploads/${file.filename}`;

    const obj = await prisma.object.update({
      where: { id },
      data: { image: imageUrl },
    });

    res.json(obj);
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.delete('/objects/:id/image', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const obj = await prisma.object.update({
      where: { id },
      data: { image: null },
    });
    res.json(obj);
  } catch (error) {
    console.error('Error removing image:', error);
    res.status(500).json({ error: 'Failed to remove image' });
  }
});

export { requireAdmin };
export default router;
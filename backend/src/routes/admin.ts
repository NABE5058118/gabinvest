import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const router = Router();

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

function requireAdmin(req: Request, res: Response, next: Function) {
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
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream',
    ];
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
    const data = req.body;
    const obj = await prisma.object.create({
      data: {
        title: data.title,
        type: data.type,
        price: Number(data.price),
        yieldPercent: Number(data.yieldPercent),
        location: data.location,
        city: data.city || null,
        area: Number(data.area),
        roi: data.roi ? Number(data.roi) : null,
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
    const data = req.body;
    const obj = await prisma.object.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        price: Number(data.price),
        yieldPercent: Number(data.yieldPercent),
        location: data.location,
        city: data.city || null,
        area: Number(data.area),
        roi: data.roi ? Number(data.roi) : null,
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
    await prisma.object.delete({ where: { id } });
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

router.get('/objects/:id/offer', async (req: Request, res: Response) => {
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

router.get('/objects/:id/offer/download', async (req: Request, res: Response) => {
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

    const filePath = path.join(uploadsDir, path.basename(obj.offerFileUrl));
    res.download(filePath, obj.offerFileName || 'offer.pdf');
  } catch (error) {
    console.error('Error downloading offer:', error);
    res.status(500).json({ error: 'Failed to download offer' });
  }
});

export default router;

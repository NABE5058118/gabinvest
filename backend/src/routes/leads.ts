import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendTelegramMessage } from '../utils/telegram.js';
import { z } from 'zod';
import { requireAdmin } from '../routes/admin.js';
import { authMiddleware } from '../middleware/jwt.js';

const router = Router();

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

const leadSchema = z.object({
  objectId: z.string().min(1, 'Объект не указан'),
  name: z.string().min(2, 'Имя слишком короткое'),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  comment: z.string().optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: 'Необходимо согласие на обработку персональных данных',
  }),
});

const statusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'done', 'cancelled']),
});

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      include: { object: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const leads = await prisma.lead.findMany({
      where: { userId },
      include: { object: { select: { id: true, title: true, location: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching user leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { objectId, name, phone, comment, consent } = parsed.data;
    const userId = req.userId || undefined;

    const obj = await prisma.object.findUnique({
      where: { id: objectId },
      include: { commercialOffer: true },
    });

    if (!obj) {
      return res.status(404).json({ error: 'Object not found' });
    }

    const lead = await prisma.lead.create({
      data: {
        objectId,
        userId,
        name,
        phone,
        comment,
        consents: {
          create: {
            consentType: 'pd_processing',
            version: '1.0',
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.get('User-Agent') || undefined,
            userId,
          },
        },
      },
    });

    if (MANAGER_CHAT_ID && BOT_TOKEN) {
      const message = `
<b>Новая заявка!</b>

<b>Объект:</b> ${escapeHtml(obj.title)}
<b>Локация:</b> ${escapeHtml(obj.location)}
<b>Цена:</b> ${obj.price.toLocaleString('ru-RU')} ₽

<b>Клиент:</b> ${escapeHtml(name)}
<b>Телефон:</b> ${escapeHtml(phone)}
${comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : ''}

<a href="https://gab-invest.ru/objects/${obj.id}">Ссылка на объект</a>
      `.trim();

      sendTelegramMessage(BOT_TOKEN, MANAGER_CHAT_ID, message);
    }

    res.status(201).json({ success: true, lead });
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    res.json(lead);
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

export default router;

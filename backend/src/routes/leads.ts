import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { sendTelegramMessage } from '../utils/telegram.js';
import { z } from 'zod';

const router = Router();

const leadSchema = z.object({
  objectId: z.string().min(1, 'Объект не указан'),
  name: z.string().min(2, 'Имя слишком короткое'),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  comment: z.string().optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: 'Необходимо согласие на обработку персональных данных',
  }),
});

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

router.post('/', async (req: Request, res: Response) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { objectId, name, phone, comment, consent } = parsed.data;

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
        name,
        phone,
        comment,
        consents: {
          create: {
            consentType: 'pd_processing',
            version: '1.0',
            ipAddress: req.ip || req.socket.remoteAddress || undefined,
            userAgent: req.get('User-Agent') || undefined,
          },
        },
      },
    });

    if (MANAGER_CHAT_ID && BOT_TOKEN) {
      const message = `
<b>Новая заявка!</b>

<b>Объект:</b> ${obj.title}
<b>Локация:</b> ${obj.location}
<b>Цена:</b> ${obj.price.toLocaleString('ru-RU')} ₽

<b>Клиент:</b> ${name}
<b>Телефон:</b> ${phone}
${comment ? `<b>Комментарий:</b> ${comment}` : ''}

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

export default router;

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { prisma } from '../lib/prisma.js';
import { sendTelegramMessage } from '../utils/telegram.js';
import { z } from 'zod';
import { requireAdmin } from '../routes/admin.js';
import { authMiddleware, optionalAuth } from '../middleware/jwt.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('leads');
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'test' ? 'test-jwt-secret' : '');
const PAGE_LIMIT = 50;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const leadSchema = z.object({
  objectId: z.string().min(1).max(100),
  name: z.string().trim().min(2, 'Имя слишком короткое').max(200),
  phone: z.string().trim().min(10, 'Некорректный номер телефона').max(40),
  comment: z.string().max(2000).optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: 'Необходимо согласие на обработку персональных данных',
  }),
  clientId: z.string().max(4096).optional(),
});

const statusSchema = z.object({
  status: z.enum(['new', 'in_progress', 'done', 'cancelled']),
});

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID || '';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_WEBHOOK_URL = (process.env.BOT_WEBHOOK_URL || '').trim();
const BOT_SYNC_SECRET = process.env.BOT_SYNC_SECRET || '';

async function notifyBotOfLead(leadId: string, text: string): Promise<void> {
  if (!BOT_WEBHOOK_URL) {
    // Фоллбэк: прямая отправка в Telegram (работает только если бэкенд может достучаться до api.telegram.org).
    if (MANAGER_CHAT_ID && BOT_TOKEN) {
      await sendTelegramMessage(BOT_TOKEN, MANAGER_CHAT_ID, text);
    }
    return;
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BOT_SYNC_SECRET) headers['x-bot-sync-secret'] = BOT_SYNC_SECRET;
  try {
    const res = await axios.post(BOT_WEBHOOK_URL, { leadId, text }, { headers, timeout: 5000 });
    logger.info('Bot webhook notified', { leadId, status: res.status });
  } catch (err: any) {
    logger.warn('Bot webhook notify failed', { leadId, status: err?.response?.status, message: err?.message });
  }
}

function issueGuestLeadToken(clientId: string): string {
  return jwt.sign({ scope: 'guest-leads', clientId }, JWT_SECRET, { expiresIn: '365d', algorithm: 'HS256' });
}

function readGuestLeadToken(token: unknown): string | null {
  if (typeof token !== 'string' || !JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as { scope?: string; clientId?: string };
    if (payload.scope !== 'guest-leads' || !payload.clientId || payload.clientId.length > 100) return null;
    return payload.clientId;
  } catch {
    return null;
  }
}

async function mergeGuestLeads(clientToken: unknown, userId: string): Promise<void> {
  const guestClientId = readGuestLeadToken(clientToken);
  if (!guestClientId) return;
  await prisma.lead.updateMany({
    where: { clientId: guestClientId, userId: null },
    data: { userId, clientId: null },
  });
}

function pagination(req: Request) {
  const pageRaw = Number.parseInt(String(req.query.page || '1'), 10);
  const limitRaw = Number.parseInt(String(req.query.limit || PAGE_LIMIT), 10);
  return {
    page: Number.isSafeInteger(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 1_000_000) : 1,
    limit: Number.isSafeInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, PAGE_LIMIT) : PAGE_LIMIT,
  };
}

router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page, limit } = pagination(req);
    const leads = await prisma.lead.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: { object: { select: { id: true, title: true, location: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    });
    logger.info('Fetched admin leads page', { count: leads.length, page });
    res.json(leads);
  } catch (error) {
    logger.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    await mergeGuestLeads(req.headers['x-client-id'], userId);
    const { page, limit } = pagination(req);
    const leads = await prisma.lead.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      include: { object: { select: { id: true, title: true, location: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    });
    logger.info('Fetched authenticated user leads', { userId, count: leads.length, page });
    res.json(leads);
  } catch (error) {
    logger.error('Error fetching user leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.post('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    const { objectId, name, phone, comment, clientId: guestToken } = parsed.data;
    const userId = req.userId || undefined;
    if (userId) await mergeGuestLeads(guestToken, userId);

    const obj = await prisma.object.findFirst({
      where: { id: objectId, moderation: { is: { status: 'approved' } } },
      select: { id: true, title: true, location: true, price: true },
    });
    if (!obj) return res.status(404).json({ error: 'Object not found' });

    let actualGuestClientId: string | undefined;
    let nextGuestToken: string | undefined;
    if (!userId) {
      actualGuestClientId = readGuestLeadToken(guestToken) || crypto.randomUUID();
      nextGuestToken = issueGuestLeadToken(actualGuestClientId);
    }

    const lead = await prisma.lead.create({
      data: {
        objectId,
        userId,
        clientId: actualGuestClientId,
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
      select: {
        id: true, objectId: true, userId: true, clientId: true,
        name: true, phone: true, comment: true, status: true, createdAt: true,
      },
    });

    logger.info('Lead created', { leadId: lead.id, objectId, userId });

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

    // Уведомление админам через вебхук бота (бот живёт на NL, где есть доступ к Telegram API;
    // бэкенд на RF не может обращаться в api.telegram.org напрямую).
    await notifyBotOfLead(lead.id, message);

    res.status(201).json({ success: true, lead, ...(nextGuestToken ? { guestToken: nextGuestToken } : {}) });
  } catch (error) {
    logger.error('Error creating lead:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

// Backward-compatible guest page. A raw localStorage ID is never accepted as proof of ownership.
router.get('/my', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { page, limit } = pagination(req);
    if (req.userId) {
      await mergeGuestLeads(req.headers['x-client-id'] || req.query.clientId, req.userId);
      const leads = await prisma.lead.findMany({
        where: { userId: req.userId },
        skip: (page - 1) * limit,
        take: limit,
        include: { object: { select: { id: true, title: true, location: true, price: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return res.json(leads);
    }

    const clientId = readGuestLeadToken(req.headers['x-client-id'] || req.query.clientId);
    if (!clientId) return res.json([]);
    const leads = await prisma.lead.findMany({
      where: { clientId, userId: null },
      skip: (page - 1) * limit,
      take: limit,
      include: { object: { select: { id: true, title: true, location: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    logger.error('Error fetching guest leads:', error);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const lead = await prisma.lead.update({ where: { id }, data: { status: parsed.data.status } });
    logger.info('Lead status updated', { leadId: id, status: parsed.data.status });
    res.json(lead);
  } catch (error) {
    logger.error('Error updating lead status:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await prisma.lead.delete({ where: { id } });
    logger.info('Lead deleted', { leadId: id });
    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting lead:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

router.delete('/my/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (req.userId) {
      const result = await prisma.lead.deleteMany({ where: { id, userId: req.userId } });
      if (result.count === 0) return res.status(404).json({ error: 'Lead not found' });
      return res.status(204).send();
    }

    const clientId = readGuestLeadToken(req.headers['x-client-id'] || req.query.clientId);
    if (!clientId) return res.status(401).json({ error: 'Unauthorized' });
    const result = await prisma.lead.deleteMany({ where: { id, clientId, userId: null } });
    if (result.count === 0) return res.status(404).json({ error: 'Lead not found' });
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting lead by owner:', error);
    res.status(500).json({ error: 'Failed to delete lead' });
  }
});

export default router;

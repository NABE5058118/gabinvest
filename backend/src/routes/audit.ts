import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';

const router = Router();
const logger = createLogger('audit');
const auditTypes = [
  'user_registered', 'user_verified', 'deal_created', 'deal_stage_changed', 'offer_sent',
  'counter_offer_sent', 'deposit_paid', 'contract_signed', 'registration_completed', 'deal_closed',
  'payment_received', 'commission_reserved', 'commission_released', 'contact_disclosed',
  'chat_message_sent', 'anti_bypass_violation', 'deal_alert_created',
] as const;

export async function recordEvent(eventType: string, data: {
  userId?: string;
  dealId?: string;
  objectId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const event = await prisma.auditEvent.create({
      data: {
        eventType: eventType as any,
        userId: data.userId,
        dealId: data.dealId,
        objectId: data.objectId,
        metadata: data.metadata as any,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
    logger.info('Audit event recorded', { id: event.id, eventType });
    return event;
  } catch (error) {
    logger.error('Failed to record audit event:', error);
    throw error;
  }
}

const eventSchema = z.object({
  eventType: z.enum(auditTypes),
  dealId: z.string().max(100).optional(),
  objectId: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });

    if (parsed.data.dealId) {
      const deal = await prisma.deal.findFirst({
        where: {
          id: parsed.data.dealId,
          OR: [{ buyerId: req.userId! }, { sellerId: req.userId! }, { agentId: req.userId! }],
        },
        select: { id: true, objectId: true },
      });
      if (!deal) return res.status(404).json({ error: 'Deal not found' });
      if (parsed.data.objectId && parsed.data.objectId !== deal.objectId) {
        return res.status(400).json({ error: 'Object does not belong to the deal' });
      }
    } else if (parsed.data.objectId) {
      const object = await prisma.object.findFirst({
        where: { id: parsed.data.objectId, moderation: { is: { status: 'approved' } } },
        select: { id: true },
      });
      if (!object) return res.status(404).json({ error: 'Object not found' });
    }

    const event = await recordEvent(parsed.data.eventType, {
      ...parsed.data,
      userId: req.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(201).json(event);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const pageParsed = Number.parseInt(String(req.query.page || '1'), 10);
    const limitParsed = Number.parseInt(String(req.query.limit || '100'), 10);
    const page = Number.isSafeInteger(pageParsed) && pageParsed > 0 ? Math.min(pageParsed, 1_000_000) : 1;
    const limit = Number.isSafeInteger(limitParsed) && limitParsed > 0 ? Math.min(limitParsed, 100) : 100;
    const where: any = {
      OR: [
        { userId: req.userId },
        { deal: { is: { OR: [{ buyerId: req.userId }, { sellerId: req.userId }, { agentId: req.userId }] } } },
      ],
    };
    if (req.query.eventType) {
      const eventType = String(req.query.eventType);
      if (!(auditTypes as readonly string[]).includes(eventType)) return res.status(400).json({ error: 'Invalid eventType' });
      where.eventType = eventType;
    }
    if (req.query.dealId) where.dealId = String(req.query.dealId);
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;

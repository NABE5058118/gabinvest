import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';

const router = Router();
const logger = createLogger('audit');

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
  eventType: z.string(),
  userId: z.string().optional(),
  dealId: z.string().optional(),
  objectId: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = eventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const event = await recordEvent(parsed.data.eventType, {
      ...parsed.data,
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
    const { eventType, dealId, userId, limit } = req.query;
    const where: any = {};
    if (eventType) where.eventType = eventType;
    if (dealId) where.dealId = dealId;
    if (userId) where.userId = userId;
    const events = await prisma.auditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 100,
    });
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
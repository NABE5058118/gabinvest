import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';

const router = Router();
const logger = createLogger('attribution');

const firstTouchSchema = z.object({
  telegramId: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  source: z.enum(['direct', 'deep_link', 'referral', 'utm', 'qr', 'invite']).default('direct'),
  campaign: z.string().optional(),
  referrer: z.string().optional(),
  ip: z.string().optional(),
  deviceFingerprint: z.string().optional(),
});

export async function recordFirstTouch(data: {
  telegramId?: string;
  phone?: string;
  email?: string;
  source?: string;
  campaign?: string;
  referrer?: string;
  ip?: string;
  deviceFingerprint?: string;
}) {
  try {
    const identityFilters = [
      data.telegramId ? { telegramId: data.telegramId } : null,
      data.phone ? { phone: data.phone } : null,
    ].filter((entry): entry is { telegramId: string } | { phone: string } => entry !== null);

    const existing = identityFilters.length
      ? await prisma.attribution.findFirst({ where: { OR: identityFilters } })
      : null;
    const knownUser = data.telegramId
      ? await prisma.user.findUnique({ where: { telegramId: data.telegramId }, select: { id: true } })
      : data.phone
        ? await prisma.user.findFirst({ where: { phone: data.phone }, select: { id: true } })
        : null;

    if (existing) {
      const updateData: any = { lastSeenAt: new Date(), lastIp: data.ip };
      if (!existing.userId && knownUser) updateData.userId = knownUser.id;
      const updated = await prisma.attribution.update({ where: { id: existing.id }, data: updateData });
      return updated;
    }

    const attribution = await prisma.attribution.create({
      data: {
        // A visitor is not a User until authenticating; never store a fabricated user ID.
        userId: knownUser?.id,
        telegramId: data.telegramId,
        phone: data.phone,
        email: data.email,
        firstTouchSource: (data.source as any) || 'direct',
        firstTouchCampaign: data.campaign,
        firstTouchReferrer: data.referrer,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        lastIp: data.ip,
        deviceFingerprint: data.deviceFingerprint,
      },
    });

    logger.info('First touch recorded', { attributionId: attribution.id, source: attribution.firstTouchSource });
    return attribution;
  } catch (error) {
    logger.error('Failed to record first touch:', error);
    throw error;
  }
}

export async function isAttributedWithin365Days(userId: string): Promise<boolean> {
  const attribution = await prisma.attribution.findUnique({
    where: { userId },
  });
  if (!attribution) return false;
  const days = Math.floor((Date.now() - attribution.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24));
  return days <= 365;
}

export async function getAttributionByTelegramId(telegramId: string) {
  return prisma.attribution.findUnique({ where: { telegramId } });
}

export async function getAttributionByPhone(phone: string) {
  return prisma.attribution.findUnique({ where: { phone } });
}

export async function getAttributionByUserId(userId: string) {
  return prisma.attribution.findUnique({ where: { userId } });
}

router.post('/first-touch', async (req: Request, res: Response) => {
  try {
    const parsed = firstTouchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }
    const attribution = await recordFirstTouch(parsed.data);
    res.json({ attributionId: attribution.id, userId: attribution.userId || null });
  } catch {
    res.status(500).json({ error: 'Failed to record first touch' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const attribution = await prisma.attribution.findUnique({ where: { userId } });
    if (!attribution) return res.status(404).json({ error: 'Not found' });
    const days = Math.floor((Date.now() - attribution.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24));
    res.json({ attributionId: attribution.id, source: attribution.firstTouchSource, campaign: attribution.firstTouchCampaign, referrer: attribution.firstTouchReferrer, firstSeenAt: attribution.firstSeenAt, daysSinceFirstTouch: days, within365: days <= 365 });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
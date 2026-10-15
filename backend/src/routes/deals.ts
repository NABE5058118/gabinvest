import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';
import { recordEvent } from './audit.js';
import { isAttributedWithin365Days } from './attribution.js';

const router = Router();
const logger = createLogger('deals');

const createDealSchema = z.object({
  objectId: z.string().min(1).max(100),
  price: z.number().positive().finite().max(2_147_483_647),
  currency: z.string().min(3).max(3).default('RUB'),
});

const changeStageSchema = z.object({
  stage: z.enum(['offer', 'counter_offer', 'deposit', 'verification', 'contract', 'registration', 'closed', 'cancelled']),
  note: z.string().max(2000).optional(),
});

async function canAccessDeal(dealId: string, userId: string) {
  return prisma.deal.findFirst({
    where: {
      id: dealId,
      OR: [{ buyerId: userId }, { sellerId: userId }, { agentId: userId }],
    },
  });
}

export async function createDeal(data: { objectId: string; buyerId: string; price: number; currency: string }) {
  const object = await prisma.object.findFirst({
    where: { id: data.objectId, moderation: { is: { status: 'approved' } } },
    select: { id: true },
  });
  if (!object) throw new Error('Object not found or not approved');

  const deal = await prisma.deal.create({
    data: {
      objectId: data.objectId,
      buyerId: data.buyerId,
      price: data.price,
      currency: data.currency,
      stage: 'offer',
      status: 'active',
    },
  });
  await recordEvent('deal_created', { dealId: deal.id, userId: data.buyerId, objectId: data.objectId, metadata: { price: data.price } });
  return deal;
}

export async function changeStage(dealId: string, stage: string, changedBy: string, note?: string) {
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.deal.findFirst({
      where: { id: dealId, OR: [{ buyerId: changedBy }, { sellerId: changedBy }, { agentId: changedBy }] },
    });
    if (!existing) throw new Error('Deal not found or access denied');
    const updated = await tx.deal.update({
      where: { id: dealId },
      data: { stage: stage as any, updatedAt: new Date() },
    });
    await tx.dealStageLog.create({
      data: { dealId, fromStage: existing.stage, toStage: stage, changedBy, note },
    });
    return { updated, previousStage: existing.stage };
  });
  await recordEvent('deal_stage_changed', { dealId, userId: changedBy, metadata: { from: result.previousStage, to: stage } });
  return result.updated;
}

export async function closeDeal(dealId: string, userId: string) {
  const existing = await canAccessDeal(dealId, userId);
  if (!existing) throw new Error('Deal not found or access denied');
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { status: 'completed', closedAt: new Date(), stage: 'closed' },
  });
  await recordEvent('deal_closed', { dealId, userId, metadata: { price: deal.price } });
  return deal;
}

router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = createDealSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const deal = await createDeal({ ...parsed.data, buyerId: req.userId! });
    res.status(201).json(deal);
  } catch (error) {
    if (error instanceof Error && error.message === 'Object not found or not approved') {
      return res.status(404).json({ error: 'Object not found' });
    }
    logger.error('Failed to create deal:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.patch('/:id/stage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = changeStageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const dealId = String(req.params.id);
    const access = await canAccessDeal(dealId, req.userId!);
    if (!access) return res.status(404).json({ error: 'Deal not found' });
    const deal = await changeStage(dealId, parsed.data.stage, req.userId!, parsed.data.note);
    res.json(deal);
  } catch (error) {
    logger.error('Failed to change stage:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/close', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deal = await closeDeal(String(req.params.id), req.userId!);
    res.json(deal);
  } catch (error) {
    if (error instanceof Error && error.message === 'Deal not found or access denied') {
      return res.status(404).json({ error: 'Deal not found' });
    }
    logger.error('Failed to close deal:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:id/attribution', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deal = await canAccessDeal(String(req.params.id), req.userId!);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const within365 = await isAttributedWithin365Days(deal.buyerId);
    res.json({ dealId: deal.id, within365 });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;

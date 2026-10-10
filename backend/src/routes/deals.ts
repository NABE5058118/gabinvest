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
  objectId: z.string(),
  buyerId: z.string(),
  sellerId: z.string().optional(),
  agentId: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().default('RUB'),
});

const changeStageSchema = z.object({
  stage: z.string(),
  note: z.string().optional(),
});

export async function createDeal(data: z.infer<typeof createDealSchema>) {
  const deal = await prisma.deal.create({
    data: {
      objectId: data.objectId,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      agentId: data.agentId,
      price: data.price,
      currency: data.currency,
      stage: 'offer',
      status: 'active',
    },
  });
  await recordEvent('deal_created', { dealId: deal.id, userId: data.buyerId, metadata: { price: data.price } });
  return deal;
}

export async function changeStage(dealId: string, stage: string, changedBy: string, note?: string) {
  const deal = await prisma.deal.update({
    where: { id: dealId },
    data: { stage: stage as any, updatedAt: new Date() },
  });
  await prisma.dealStageLog.create({
    data: { dealId, fromStage: deal.stage, toStage: stage, changedBy, note },
  });
  await recordEvent('deal_stage_changed', { dealId, userId: changedBy, metadata: { from: deal.stage, to: stage } });
  return deal;
}

export async function closeDeal(dealId: string, userId: string) {
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
    const deal = await createDeal(parsed.data);
    res.status(201).json(deal);
  } catch (error) {
    logger.error('Failed to create deal:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.patch('/:id/stage', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = changeStageSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const deal = await changeStage(req.params.id as string, parsed.data.stage, req.userId!, parsed.data.note);
    res.json(deal);
  } catch (error) {
    logger.error('Failed to change stage:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/close', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deal = await closeDeal(req.params.id as string, req.userId!);
    res.json(deal);
  } catch (error) {
    logger.error('Failed to close deal:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:id/attribution', authMiddleware, async (req: Request, res: Response) => {
  try {
    const deal = await prisma.deal.findUnique({ where: { id: req.params.id as string } });
    if (!deal) return res.status(404).json({ error: 'Not found' });
    const within365 = await isAttributedWithin365Days(deal.buyerId);
    res.json({ dealId: deal.id, buyerId: deal.buyerId, within365 });
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
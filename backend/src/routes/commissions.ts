import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';
import { recordEvent } from './audit.js';

const router = Router();
const logger = createLogger('commission');

const COMMISSION_RATE = 20;

export async function reserveCommission(dealId: string, amount: number, paymentMethod?: string, providerRef?: string) {
  const commissionAmount = Math.round(amount * COMMISSION_RATE / 100);
  const commission = await prisma.commission.create({
    data: {
      dealId,
      amount: commissionAmount,
      rate: COMMISSION_RATE,
      status: 'reserved',
      reservedAt: new Date(),
      paymentMethod,
      providerRef,
    },
  });
  await recordEvent('commission_reserved', { dealId, metadata: { amount: commissionAmount, rate: COMMISSION_RATE } });
  logger.info('Commission reserved', { commissionId: commission.id, amount: commissionAmount });
  return commission;
}

export async function releaseCommission(commissionId: string, releasedTo: string) {
  const commission = await prisma.commission.update({
    where: { id: commissionId },
    data: { status: 'released', releasedAt: new Date(), releasedTo },
  });
  await recordEvent('commission_released', { dealId: commission.dealId, metadata: { amount: commission.amount } });
  return commission;
}

export async function getCommissionByDeal(dealId: string) {
  return prisma.commission.findFirst({ where: { dealId } });
}

const reserveSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.string().optional(),
  providerRef: z.string().optional(),
});

router.post('/:dealId/reserve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = reserveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    const commission = await reserveCommission(req.params.dealId as string, parsed.data.amount, parsed.data.paymentMethod, parsed.data.providerRef);
    res.status(201).json(commission);
  } catch (error) {
    logger.error('Failed to reserve commission:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.post('/:id/release', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { releasedTo } = z.object({ releasedTo: z.string() }).parse(req.body);
    const commission = await releaseCommission(req.params.id as string, releasedTo);
    res.json(commission);
  } catch (error) {
    logger.error('Failed to release commission:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:dealId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const commission = await getCommissionByDeal(req.params.dealId as string);
    if (!commission) return res.status(404).json({ error: 'Not found' });
    res.json(commission);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
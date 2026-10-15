import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { authMiddleware } from '../middleware/jwt.js';
import { requireAdmin } from './admin.js';
import { recordEvent } from './audit.js';

const router = Router();
const logger = createLogger('commission');
const COMMISSION_RATE = 20;

async function getAccessibleDeal(dealId: string, userId: string) {
  return prisma.deal.findFirst({
    where: { id: dealId, OR: [{ buyerId: userId }, { sellerId: userId }, { agentId: userId }] },
  });
}

export async function reserveCommission(dealId: string, amount: number, paymentMethod?: string, providerRef?: string) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: { id: true, price: true } });
  if (!deal || amount > deal.price) throw new Error('Invalid commission amount');
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
  const existing = await prisma.commission.findUnique({ where: { id: commissionId }, select: { id: true, dealId: true, status: true } });
  if (!existing) throw new Error('Commission not found');
  if (existing.status !== 'reserved') throw new Error('Commission is not reserved');
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
  amount: z.number().positive().finite(),
  paymentMethod: z.string().max(100).optional(),
  providerRef: z.string().max(200).optional(),
});

router.post('/:dealId/reserve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dealId = String(req.params.dealId);
    const deal = await getAccessibleDeal(dealId, req.userId!);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const parsed = reserveSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0].message });
    if (parsed.data.amount > deal.price) return res.status(400).json({ error: 'Amount exceeds deal price' });
    const commission = await reserveCommission(dealId, parsed.data.amount, parsed.data.paymentMethod, parsed.data.providerRef);
    res.status(201).json(commission);
  } catch (error) {
    logger.error('Failed to reserve commission:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

// Releasing funds is an administrative action, not a regular participant action.
router.post('/:id/release', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ releasedTo: z.string().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid releasedTo' });
    const commission = await releaseCommission(String(req.params.id), parsed.data.releasedTo);
    res.json(commission);
  } catch (error) {
    if (error instanceof Error && error.message === 'Commission not found') return res.status(404).json({ error: 'Commission not found' });
    if (error instanceof Error && error.message === 'Commission is not reserved') return res.status(409).json({ error: 'Commission is not reserved' });
    logger.error('Failed to release commission:', error);
    res.status(500).json({ error: 'Failed' });
  }
});

router.get('/:dealId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const dealId = String(req.params.dealId);
    const deal = await getAccessibleDeal(dealId, req.userId!);
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    const commission = await getCommissionByDeal(dealId);
    if (!commission) return res.status(404).json({ error: 'Not found' });
    res.json(commission);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;

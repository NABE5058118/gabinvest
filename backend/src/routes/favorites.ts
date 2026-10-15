import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/jwt.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
const logger = createLogger('favorites');
const PAGE_LIMIT = 100;

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pageParsed = Number.parseInt(String(req.query.page || '1'), 10);
    const limitParsed = Number.parseInt(String(req.query.limit || PAGE_LIMIT), 10);
    const page = Number.isSafeInteger(pageParsed) && pageParsed > 0 ? Math.min(pageParsed, 1_000_000) : 1;
    const limit = Number.isSafeInteger(limitParsed) && limitParsed > 0 ? Math.min(limitParsed, PAGE_LIMIT) : PAGE_LIMIT;
    const favorites = await prisma.favorite.findMany({
      where: { userId, object: { moderation: { is: { status: 'approved' } } } },
      select: { object: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    logger.info('Fetched favorites page', { userId, count: favorites.length, page });
    res.json(favorites);
  } catch (error) {
    logger.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/merge', async (req: Request, res: Response) => {
  try {
    const parsed = z.object({ objectIds: z.array(z.string().min(1).max(100)).max(1000) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid favorites list' });
    const ids = Array.from(new Set(parsed.data.objectIds));
    const available = await prisma.object.findMany({
      where: { id: { in: ids }, moderation: { is: { status: 'approved' } } },
      select: { id: true },
    });
    if (available.length) {
      await prisma.favorite.createMany({
        data: available.map((object) => ({ userId: req.userId!, objectId: object.id })),
        skipDuplicates: true,
      });
    }
    res.json({ merged: available.length });
  } catch (error) {
    logger.error('Error merging favorites:', error);
    res.status(500).json({ error: 'Failed to merge favorites' });
  }
});

router.post('/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const objectId = String(req.params.objectId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const object = await prisma.object.findFirst({
      where: { id: objectId, moderation: { is: { status: 'approved' } } },
      select: { id: true },
    });
    if (!object) return res.status(404).json({ error: 'Object not found' });

    const favorite = await prisma.favorite.upsert({
      where: { userId_objectId: { userId, objectId } },
      update: {},
      create: { userId, objectId },
    });
    logger.info('Favorite added', { userId, objectId });
    res.status(201).json(favorite);
  } catch (error) {
    logger.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const objectId = String(req.params.objectId);
    const result = await prisma.favorite.deleteMany({ where: { userId, objectId } });
    if (!result.count) return res.status(404).json({ error: 'Favorite not found' });
    logger.info('Favorite removed', { userId, objectId });
    res.status(204).send();
  } catch (error) {
    logger.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;

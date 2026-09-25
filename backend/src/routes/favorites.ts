import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/jwt.js';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('favorites');

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { object: true },
    });

    logger.info('Fetched favorites', { userId, count: favorites.length });
    res.json(favorites.map((f: { object: any }) => f.object));
  } catch (error) {
    logger.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const objectId = String(req.params.objectId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const object = await prisma.object.findUnique({
      where: { id: objectId },
      select: { id: true },
    });

    if (!object) {
      return res.status(404).json({ error: 'Object not found' });
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_objectId: {
          userId,
          objectId,
        },
      },
      update: {},
      create: {
        userId,
        objectId,
      },
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

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_objectId: {
          userId,
          objectId,
        },
      },
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorite not found' });
    }

    await prisma.favorite.delete({
      where: {
        userId_objectId: {
          userId,
          objectId,
        },
      },
    });

    logger.info('Favorite removed', { userId, objectId });
    res.status(204).send();
  } catch (error) {
    logger.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;

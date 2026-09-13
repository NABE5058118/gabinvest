import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { parseInitData } from '../utils/telegram';

const router = Router();

async function getUserId(req: Request, res: Response, next: NextFunction) {
  try {
    const initData = req.headers['x-telegram-init-data'] as string | undefined;
    if (!initData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = parseInitData(initData);
    if (!user) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    req.userId = String(user.id);
    next();
  } catch (error) {
    console.error('Error parsing initData:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
}

router.get('/', getUserId, async (req: Request, res: Response) => {
  try {
    const telegramId = req.userId as string;
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: { object: true },
    });

    res.json(favorites.map((f) => f.object));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/:objectId', getUserId, async (req: Request, res: Response) => {
  try {
    const telegramId = req.userId as string;
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const objectId = String(req.params.objectId);

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_objectId: {
          userId: user.id,
          objectId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        objectId,
      },
    });

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/:objectId', getUserId, async (req: Request, res: Response) => {
  try {
    const telegramId = req.userId as string;
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const objectId = String(req.params.objectId);

    await prisma.favorite.delete({
      where: {
        userId_objectId: {
          userId: user.id,
          objectId,
        },
      },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export default router;

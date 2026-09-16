import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/jwt.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { object: true },
    });

    res.json(favorites.map((f: { object: any }) => f.object));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const objectId = String(req.params.objectId);

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

    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const objectId = String(req.params.objectId);

    await prisma.favorite.delete({
      where: {
        userId_objectId: {
          userId,
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

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: { object: true },
    });

    res.json(favorites.map((f) => f.object));
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

router.post('/:userId/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
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

router.delete('/:userId/:objectId', async (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId);
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

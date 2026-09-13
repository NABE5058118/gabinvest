import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { parseInitData } from '../utils/telegram';

const router = Router();

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData) {
      return res.status(400).json({ error: 'initData is required' });
    }

    const user = parseInitData(initData);
    if (!user) {
      return res.status(400).json({ error: 'Invalid initData' });
    }

    const telegramId = String(user.id);

    const dbUser = await prisma.user.upsert({
      where: { telegramId },
      update: {
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        username: user.username || undefined,
      },
      create: {
        telegramId,
        firstName: user.first_name || undefined,
        lastName: user.last_name || undefined,
        username: user.username || undefined,
      },
    });

    res.json(dbUser);
  } catch (error) {
    console.error('Error in telegram auth:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const initData = req.headers['x-telegram-init-data'] as string | undefined;
    if (!initData) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = parseInitData(initData);
    if (!user) {
      return res.status(401).json({ error: 'Invalid initData' });
    }

    const telegramId = String(user.id);
    const { firstName, lastName, username } = req.body;

    const dbUser = await prisma.user.update({
      where: { telegramId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
      },
    });

    res.json(dbUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTelegramInitData, parseInitData } from '../utils/telegram.js';
import bcrypt from 'bcrypt';
import { signToken, authMiddleware } from '../middleware/jwt.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('auth');

const registerSchema = z.object({
  phone: z.string().min(10, 'Некорректный номер телефона'),
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Введите номер телефона или email'),
  password: z.string().min(1, 'Введите пароль'),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { phone, email, password, firstName, lastName } = parsed.data;

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ phone }, { email }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        phone,
        email,
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
      },
    });

    const token = signToken(user.id);
    logger.info('User registered', { userId: user.id });
    res.status(201).json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
      },
      token,
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { login, password } = parsed.data;

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: login }, { email: login }],
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = signToken(user.id);
    logger.info('User logged in', { userId: user.id });
    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || 'user',
      },
      token,
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData || typeof initData !== 'string') {
      return res.status(400).json({ error: 'initData is required' });
    }

    if (initData.length > 4096) {
      return res.status(400).json({ error: 'initData is too long' });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      return res.status(500).json({ error: 'Server misconfigured' });
    }

    const isValid = validateTelegramInitData(initData, botToken);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Telegram init data' });
    }

    const user = parseInitData(initData);
    if (!user) {
      return res.status(400).json({ error: 'Invalid initData' });
    }

    const telegramId = String(user.id);

    const updateData: any = {
      firstName: user.first_name || undefined,
      lastName: user.last_name || undefined,
      username: user.username || undefined,
    };
    if (user.photo_url !== undefined) updateData.telegramPhotoUrl = user.photo_url;
    if (user.language_code !== undefined) updateData.telegramLang = user.language_code;
    if (user.is_premium !== undefined) updateData.telegramPremium = user.is_premium;
    if (user.allows_write_to_pm !== undefined) updateData.telegramAllowsPm = user.allows_write_to_pm;

    const createData: any = {
      telegramId,
      firstName: user.first_name || undefined,
      lastName: user.last_name || undefined,
      username: user.username || undefined,
      telegramPhotoUrl: user.photo_url || undefined,
      telegramLang: user.language_code || undefined,
      telegramPremium: user.is_premium || undefined,
      telegramAllowsPm: user.allows_write_to_pm || undefined,
    };

    const dbUser = await prisma.user.upsert({
      where: { telegramId },
      update: updateData,
      create: createData,
    });

    logger.info('Telegram auth success', { telegramId: dbUser.telegramId, userId: dbUser.id });

    const token = signToken(dbUser.telegramId || dbUser.id);

    res.json({
      user: {
        id: dbUser.id,
        phone: dbUser.phone,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        username: dbUser.username,
        telegramId: dbUser.telegramId,
        telegramPhotoUrl: dbUser.telegramPhotoUrl,
        telegramLang: dbUser.telegramLang,
        telegramPremium: dbUser.telegramPremium,
        telegramAllowsPm: dbUser.telegramAllowsPm,
        role: dbUser.role || 'user',
      },
      token,
    });
  } catch (error) {
    logger.error('Error in telegram auth:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

router.post('/telegram/bot-sync', async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium, allowsWriteToPm } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    const updateData: any = {};
    if (firstName !== undefined) updateData.firstName = firstName || undefined;
    if (lastName !== undefined) updateData.lastName = lastName || undefined;
    if (username !== undefined) updateData.username = username || undefined;
    if (photoUrl !== undefined) updateData.telegramPhotoUrl = photoUrl || undefined;
    if (languageCode !== undefined) updateData.telegramLang = languageCode || undefined;
    if (isPremium !== undefined) updateData.telegramPremium = isPremium;
    if (allowsWriteToPm !== undefined) updateData.telegramAllowsPm = allowsWriteToPm;

    const createData: any = {
      telegramId: String(telegramId),
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      username: username || undefined,
      telegramPhotoUrl: photoUrl || undefined,
      telegramLang: languageCode || undefined,
      telegramPremium: isPremium || undefined,
      telegramAllowsPm: allowsWriteToPm || undefined,
    };

    const dbUser = await prisma.user.upsert({
      where: { telegramId: String(telegramId) },
      update: updateData,
      create: createData,
    });

    res.json({
      id: dbUser.id,
      telegramId: dbUser.telegramId,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      username: dbUser.username,
      phone: dbUser.phone,
      email: dbUser.email,
      createdAt: dbUser.createdAt,
    });
  } catch (error) {
    logger.error('Error in telegram bot sync:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        telegramId: true,
        createdAt: true,
      },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(dbUser);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { firstName, lastName, username, phone } = req.body;

    const dbUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
        phone: phone || undefined,
      },
    });

    logger.info('Profile updated', { userId: dbUser.id });
    res.json({
      id: dbUser.id,
      phone: dbUser.phone,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      username: dbUser.username,
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

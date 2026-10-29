import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { validateTelegramInitData, parseInitData } from '../utils/telegram.js';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { matchesBotSyncSecret } from '../lib/botSync.js';
import { authMiddleware } from '../middleware/jwt.js';
import {
  signAccessToken,
  signRefreshToken,
  storeRefreshToken,
  revokeRefreshToken,
  clearAuthCookies,
  setAuthCookies,
  verifyStoredRefreshToken,
  ACCESS_TOKEN_EXPIRY_SECONDS,
} from '../lib/tokens.js';

const router = Router();
const logger = createLogger('auth');

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2002';
}

const registerSchema = z.object({
  phone: z.string().min(10, 'Некорректный номер телефона').max(40),
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
  firstName: z.string().max(200).optional(),
  lastName: z.string().max(200).optional(),
});

const loginSchema = z.object({
  login: z.string().min(1, 'Введите номер телефона или email'),
  password: z.string().min(1, 'Введите пароль'),
});

async function issueTokens(res: Response, userId: string, telegramId?: string, role?: string): Promise<void> {
  const accessToken = signAccessToken(userId, 'user', telegramId, role);
  const refreshToken = signRefreshToken(userId, 'user');
  await storeRefreshToken(userId, refreshToken, res.req);
  setAuthCookies(res, accessToken, refreshToken);
}

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

    await issueTokens(res, user.id, user.telegramId || undefined, user.role || undefined);
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
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }
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

    await issueTokens(res, user.id, user.telegramId || undefined, user.role || undefined);
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
    });
  } catch (error) {
    logger.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const verified = await verifyStoredRefreshToken(refreshToken, 'user');
    if (!verified) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = signAccessToken(verified.userId, 'user', verified.telegramId, verified.role);
    const newRefreshToken = signRefreshToken(verified.userId, 'user');

    await revokeRefreshToken(refreshToken);
    await storeRefreshToken(verified.userId, newRefreshToken, req);

    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error refreshing token:', error);
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    clearAuthCookies(res);
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error during logout:', error);
    clearAuthCookies(res);
    res.json({ ok: true });
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

    logger.info('Telegram auth: incoming user data', {
      telegramId,
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
    });

    const dbUser = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        telegramId: true,
        telegramPhotoUrl: true,
        telegramLang: true,
        telegramPremium: true,
        telegramAllowsPm: true,
        role: true,
      },
    });

    if (dbUser) {
      await prisma.attribution.updateMany({ where: { telegramId, userId: null }, data: { userId: dbUser.id } });

      const updateData: any = {
        firstName: user.first_name || user.username || dbUser.firstName,
        lastName: user.last_name || dbUser.lastName,
        username: user.username || dbUser.username,
        telegramPhotoUrl: user.photo_url || dbUser.telegramPhotoUrl,
        telegramLang: user.language_code || dbUser.telegramLang,
        telegramPremium: user.is_premium !== undefined ? user.is_premium : dbUser.telegramPremium,
        telegramAllowsPm: user.allows_write_to_pm !== undefined ? user.allows_write_to_pm : dbUser.telegramAllowsPm,
      };

      await prisma.user.update({
        where: { id: dbUser.id },
        data: updateData,
      });

      logger.info('Telegram auth: user already exists, profile updated', {
        telegramId: dbUser.telegramId,
        userId: dbUser.id,
      });

      const updatedUser = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          id: true,
          phone: true,
          email: true,
          firstName: true,
          lastName: true,
          username: true,
          telegramId: true,
          telegramPhotoUrl: true,
          telegramLang: true,
          telegramPremium: true,
          telegramAllowsPm: true,
          role: true,
        },
      });

      await issueTokens(res, dbUser.id, dbUser.telegramId || undefined, dbUser.role || undefined);
      return res.json({
        user: {
          id: updatedUser!.id,
          phone: updatedUser!.phone,
          email: updatedUser!.email,
          firstName: updatedUser!.firstName,
          lastName: updatedUser!.lastName,
          username: updatedUser!.username,
          telegramId: updatedUser!.telegramId,
          telegramPhotoUrl: updatedUser!.telegramPhotoUrl,
          telegramLang: updatedUser!.telegramLang,
          telegramPremium: updatedUser!.telegramPremium,
          telegramAllowsPm: updatedUser!.telegramAllowsPm,
          role: updatedUser!.role || 'user',
        },
      });
    }

    const createData: any = {
      telegramId,
      firstName: user.first_name || user.username || undefined,
      lastName: user.last_name || undefined,
      username: user.username || undefined,
      telegramPhotoUrl: user.photo_url || undefined,
      telegramLang: user.language_code || undefined,
      telegramPremium: user.is_premium || undefined,
      telegramAllowsPm: user.allows_write_to_pm || undefined,
    };

    const newUser = await prisma.user.create({
      data: createData,
    });
    await prisma.attribution.updateMany({ where: { telegramId, userId: null }, data: { userId: newUser.id } });

    logger.info('Telegram auth success: user created', {
      telegramId: newUser.telegramId,
      userId: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      username: newUser.username,
    });

    await issueTokens(res, newUser.id, newUser.telegramId || undefined, newUser.role || undefined);

    res.json({
      user: {
        id: newUser.id,
        phone: newUser.phone,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        telegramId: newUser.telegramId,
        telegramPhotoUrl: newUser.telegramPhotoUrl,
        telegramLang: newUser.telegramLang,
        telegramPremium: newUser.telegramPremium,
        telegramAllowsPm: newUser.telegramAllowsPm,
        role: newUser.role || 'user',
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Пользователь уже существует' });
    }
    logger.error('Error in telegram auth:', error);
    res.status(500).json({ error: 'Failed to authenticate' });
  }
});

router.post('/telegram/bot-sync', async (req: Request, res: Response) => {
  const suppliedSecret = req.get('x-bot-sync-secret') || '';
  if (!matchesBotSyncSecret(suppliedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { telegramId, firstName, lastName, username, photoUrl, languageCode, isPremium, allowsWriteToPm } = req.body;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }

    logger.info('Telegram bot-sync: incoming payload', {
      telegramId,
      firstName,
      lastName,
      username,
      languageCode,
      isPremium,
      allowsWriteToPm,
    });

    const existing = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) },
      select: { id: true, firstName: true, lastName: true },
    });

    logger.info('Telegram bot-sync: existing user', {
      telegramId,
      exists: !!existing,
      existingFirstName: existing?.firstName ?? null,
      existingLastName: existing?.lastName ?? null,
    });

    const updateData: any = {};
    if (!existing?.firstName && firstName !== undefined && firstName !== '') {
      updateData.firstName = firstName.trim();
    }
    if (!existing?.lastName && lastName !== undefined && lastName !== '') {
      updateData.lastName = lastName.trim();
    }
    if (username !== undefined) updateData.username = username || undefined;
    if (photoUrl !== undefined) updateData.telegramPhotoUrl = photoUrl || undefined;
    if (languageCode !== undefined) updateData.telegramLang = languageCode || undefined;
    if (isPremium !== undefined) updateData.telegramPremium = isPremium;
    if (allowsWriteToPm !== undefined) updateData.telegramAllowsPm = allowsWriteToPm;

    const createData: any = {
      telegramId: String(telegramId),
      firstName: (firstName && firstName.trim()) || (username ? username.trim() : undefined),
      lastName: (lastName && lastName.trim()) || undefined,
      username: username || undefined,
      telegramPhotoUrl: photoUrl || undefined,
      telegramLang: languageCode || undefined,
      telegramPremium: isPremium || undefined,
      telegramAllowsPm: allowsWriteToPm || undefined,
    };

    try {
      const dbUser = await prisma.user.upsert({
        where: { telegramId: String(telegramId) },
        update: Object.keys(updateData).length > 0 ? updateData : {},
        create: createData,
      });

      logger.info('Telegram bot-sync: result', {
        telegramId: dbUser.telegramId,
        userId: dbUser.id,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        username: dbUser.username,
        updated: Object.keys(updateData).length > 0,
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
    } catch (err: any) {
      if (isUniqueViolation(err)) {
        const dbUser = await prisma.user.findUnique({
          where: { telegramId: String(telegramId) },
        });
        if (!dbUser) {
          return res.status(500).json({ error: 'Failed to sync user' });
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({ where: { id: dbUser.id }, data: updateData });
        }
        logger.info('Telegram bot-sync: resolved race, returned existing user', {
          telegramId: dbUser.telegramId,
          userId: dbUser.id,
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
      } else {
        throw err;
      }
    }
  } catch (error) {
    logger.error('Error in telegram bot sync:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

router.post('/telegram/notify-toggle', async (req: Request, res: Response) => {
  const suppliedSecret = req.get('x-bot-sync-secret') || '';
  if (!matchesBotSyncSecret(suppliedSecret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { telegramId } = req.body;
    if (!telegramId) {
      return res.status(400).json({ error: 'telegramId is required' });
    }
    const user = await prisma.user.findUnique({ where: { telegramId: String(telegramId) } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const updated = await prisma.user.update({
      where: { telegramId: String(telegramId) },
      data: { notifyNewObjects: !user.notifyNewObjects },
      select: { id: true, telegramId: true, notifyNewObjects: true },
    });
    res.json({ subscribed: updated.notifyNewObjects ?? false });
  } catch (error) {
    logger.error('Error toggling notify subscription:', error);
    res.status(500).json({ error: 'Failed to toggle subscription' });
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

    logger.info('Auth /me returned user', {
      userId: dbUser.id,
      telegramId: dbUser.telegramId,
    });

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

    const { firstName, lastName, username, phone, email } = req.body;

    logger.info('Profile update request', {
      userId,
      firstName,
      lastName,
      username,
      phone,
      email,
    });

    if (phone) {
      const phoneOwner = await prisma.user.findFirst({
        where: {
          phone,
          NOT: { id: userId },
        },
      });
      if (phoneOwner) {
        return res.status(400).json({ error: 'Телефон уже используется другим пользователем' });
      }
    }

    if (email) {
      const emailOwner = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });
      if (emailOwner) {
        return res.status(400).json({ error: 'Email уже используется другим пользователем' });
      }
    }

    const cleared = (value: string | undefined | null) => {
      if (value === undefined || value === null) return value === null ? null : undefined;
      return value.trim() || null;
    };

    const dbUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        username: username || undefined,
        phone: cleared(phone),
        email: cleared(email),
      },
    });

    logger.info('Profile updated', {
      userId: dbUser.id,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      username: dbUser.username,
    });
    res.json({
      id: dbUser.id,
      phone: dbUser.phone,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      username: dbUser.username,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return res.status(409).json({ error: 'Телефон или email уже используются другим пользователем' });
    }
    logger.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

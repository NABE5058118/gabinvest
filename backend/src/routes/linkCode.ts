import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware } from '../middleware/jwt.js';
import { matchesBotSyncSecret } from '../lib/botSync.js';
import { createLogger } from '../utils/logger.js';
import { z } from 'zod';

const router = Router();
const logger = createLogger('link-code');

const LINK_CODE_TTL_MINUTES = 5;
const LINK_CODE_LENGTH = 6;

function generateLinkCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < LINK_CODE_LENGTH; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const generateSchema = z.object({});

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Если есть активный неиспользованный неистекший код — вернуть его
    const existing = await prisma.linkCode.findFirst({
      where: {
        userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      logger.info('Link code reused', { userId, code: existing.code });
      const ttlMinutes = Math.max(0, Math.round((existing.expiresAt.getTime() - Date.now()) / 1000 / 60));
      return res.json({
        code: existing.code,
        expiresInMinutes: ttlMinutes,
        reused: true,
      });
    }

    // Удалить все истекшие непроиспользованные коды
    await prisma.linkCode.deleteMany({
      where: { userId, usedAt: null, expiresAt: { lte: new Date() } },
    });

    const code = generateLinkCode();
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60 * 1000);

    const linkCode = await prisma.linkCode.create({
      data: {
        code,
        userId,
        expiresAt,
      },
    });

    logger.info('Link code generated', { userId, code, expiresAt });

    res.json({
      code: linkCode.code,
      expiresInMinutes: LINK_CODE_TTL_MINUTES,
    });
  } catch (error) {
    logger.error('Error generating link code:', error);
    res.status(500).json({ error: 'Failed to generate link code' });
  }
});

const verifySchema = z.object({
  code: z.string().min(1, 'Код обязателен').max(20),
  telegramId: z.string().min(1, 'telegramId обязателен'),
});

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const suppliedSecret = req.get('x-bot-sync-secret') || '';
    if (!matchesBotSyncSecret(suppliedSecret)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { code, telegramId } = parsed.data;

    const linkCode = await prisma.linkCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!linkCode) {
      return res.status(400).json({ error: 'Неверный код' });
    }

    if (linkCode.usedAt) {
      return res.status(400).json({ error: 'Код уже использован' });
    }

    if (linkCode.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Код истёк' });
    }

    // Проверить, не привязан ли этот telegramId уже к другому пользователю
    const existingTelegramUser = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true, phone: true, email: true, passwordHash: true },
    });

    if (existingTelegramUser && existingTelegramUser.id !== linkCode.userId) {
      // Если существующий пользователь с таким telegramId — "пустой" (создан ботом,
      // нет телефона и email), можно безопасно перепривязать к веб-пользователю
      const isEmptyBotUser =
        !existingTelegramUser.phone &&
        !existingTelegramUser.email &&
        !existingTelegramUser.passwordHash;

      if (isEmptyBotUser) {
        // Обнуляем telegramId у пустого пользователя бота, чтобы освободить его для привязки
        await prisma.user.update({
          where: { id: existingTelegramUser.id },
          data: { telegramId: null },
        });
      } else {
        return res.status(409).json({
          error: 'Этот Telegram уже привязан к другому аккаунту',
        });
      }
    }

    // Привязать telegramId к пользователю из кода
    const user = await prisma.user.update({
      where: { id: linkCode.userId },
      data: {
        telegramId,
        telegramPhotoUrl: linkCode.user.telegramPhotoUrl ?? undefined,
        telegramLang: linkCode.user.telegramLang ?? undefined,
        telegramPremium: linkCode.user.telegramPremium ?? undefined,
        telegramAllowsPm: linkCode.user.telegramAllowsPm ?? undefined,
      },
      select: {
        id: true,
        telegramId: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
      },
    });

    // Пометить код как использованный
    await prisma.linkCode.update({
      where: { id: linkCode.id },
      data: { usedAt: new Date(), telegramId },
    });

    logger.info('Telegram linked to user', {
      userId: linkCode.userId,
      telegramId,
      code,
    });

    res.json({
      ok: true,
      user,
    });
  } catch (error) {
    logger.error('Error verifying link code:', error);
    res.status(500).json({ error: 'Failed to verify link code' });
  }
});

export default router;

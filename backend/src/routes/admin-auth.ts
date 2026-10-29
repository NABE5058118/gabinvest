import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';
import { adminAuthMiddleware } from '../middleware/jwt.js';
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
const logger = createLogger('admin-auth');

const adminLoginSchema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});

async function issueAdminTokens(res: Response, userId: string): Promise<void> {
  const accessToken = signAccessToken(userId, 'admin');
  const refreshToken = signRefreshToken(userId, 'admin');
  await storeRefreshToken(userId, refreshToken, res.req);
  setAuthCookies(res, accessToken, refreshToken);
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn('Admin login validation failed', { errors: parsed.error.errors.map((e) => e.message) });
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { login, password } = parsed.data;

    const admin = await prisma.user.findFirst({
      where: {
        OR: [{ email: login }, { phone: login }],
        role: 'admin',
      },
    });

    if (!admin || !admin.passwordHash) {
      logger.warn('Admin login failed: user not found', { login });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      logger.warn('Admin login failed: invalid password', { login, userId: admin.id });
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    await issueAdminTokens(res, admin.id);

    logger.info('Admin login success', { userId: admin.id, login });
    res.json({
      user: {
        id: admin.id,
        email: admin.email,
        phone: admin.phone,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: 'admin',
      },
    });
  } catch (error) {
    logger.error('Error in admin login', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const verified = await verifyStoredRefreshToken(refreshToken, 'admin');
    if (!verified) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accessToken = signAccessToken(verified.userId, 'admin');
    const newRefreshToken = signRefreshToken(verified.userId, 'admin');

    await revokeRefreshToken(refreshToken);
    await storeRefreshToken(verified.userId, newRefreshToken, req);

    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ ok: true });
  } catch (error) {
    logger.error('Error refreshing admin token:', error);
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
    logger.error('Error during admin logout:', error);
    clearAuthCookies(res);
    res.json({ ok: true });
  }
});

router.get('/me', adminAuthMiddleware, async (req: Request, res: Response) => {
  try {
    if (!req.userId && !req.adminActor) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = req.userId || req.adminActor;
    if (userId && userId !== 'static-admin-token') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      return res.json({ user });
    }

    return res.status(401).json({ error: 'Unauthorized' });
  } catch (error) {
    logger.error('Error fetching admin profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

export default router;

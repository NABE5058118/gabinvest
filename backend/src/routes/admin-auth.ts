import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';
import { createLogger } from '../utils/logger.js';

const router = Router();
const logger = createLogger('admin-auth');

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET;

if (process.env.NODE_ENV !== 'test') {
  if (!JWT_SECRET) {
    logger.fatal('JWT_SECRET is not set');
    process.exit(1);
  }

  if (!ADMIN_JWT_SECRET) {
    logger.fatal('ADMIN_JWT_SECRET is not set');
    process.exit(1);
  }
}

const adminLoginSchema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});

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

    const token = jwt.sign(
      { userId: admin.id, role: 'admin' },
      ADMIN_JWT_SECRET as string,
      { expiresIn: '12h', algorithm: 'HS256' }
    );

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
      token,
    });
  } catch (error) {
    logger.error('Error in admin login', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;

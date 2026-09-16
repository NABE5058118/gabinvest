import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { z } from 'zod';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me-admin-in-production';

const adminLoginSchema = z.object({
  login: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Введите пароль'),
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) {
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
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const token = jwt.sign(
      { userId: admin.id, role: 'admin' },
      ADMIN_JWT_SECRET,
      { expiresIn: '12h' }
    );

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
    console.error('Error in admin login:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

export default router;

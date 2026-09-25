import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('jwt');

const JWT_SECRET = process.env.JWT_SECRET as string;

if (process.env.NODE_ENV !== 'test' && !JWT_SECRET) {
  logger.fatal('JWT_SECRET is not set');
  process.exit(1);
}

export function signToken(telegramId: string): string;
export function signToken(telegramId: string | null, userId: string): string;
export function signToken(telegramIdOrUser: string | null, userId?: string): string {
  if (telegramIdOrUser && !userId) {
    return jwt.sign({ telegramId: telegramIdOrUser }, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
  }

  const payload: Record<string, string> = {};
  if (telegramIdOrUser) payload.telegramId = telegramIdOrUser;
  if (userId) payload.userId = userId;

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { telegramId?: string; userId?: string };
    const telegramId = payload.telegramId;
    const userId = payload.userId;

    if (!telegramId && !userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    let user;
    if (telegramId) {
      user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      });
    }

    if (!user && userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { telegramId?: string; userId?: string };
      const telegramId = payload.telegramId;
      const userId = payload.userId;

      if (telegramId || userId) {
        prisma.user.findUnique({
          where: telegramId ? { telegramId } : { id: userId },
          select: { id: true },
        }).then((user) => {
          if (user) {
            req.userId = user.id;
          }
        }).catch(() => {
          // ignore
        });
      }
    } catch {
      // ignore
    }
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

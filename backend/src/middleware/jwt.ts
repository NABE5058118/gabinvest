import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
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
      const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
      req.userId = payload.userId;
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

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken, verifyStoredRefreshToken, signAccessToken, ACCESS_TOKEN_EXPIRY_SECONDS, TokenScope } from '../lib/tokens.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('auth');

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const token = accessToken || bearerToken;
  if (token) {
    const payload = verifyAccessToken(token, 'user');
    if (payload) {
      req.userId = payload.userId;
      return next();
    }
  }

  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const refreshed = await tryRefresh(refreshToken, req, res);
    if (refreshed) {
      req.userId = refreshed.userId;
      return next();
    }
  } catch (error) {
    logger.warn('Token refresh failed during auth', { error: error instanceof Error ? error.message : 'unknown' });
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

async function tryRefresh(refreshToken: string, req: Request, res: Response): Promise<{ userId: string } | null> {
  const verified = await verifyStoredRefreshToken(refreshToken, 'user');
  if (!verified) return null;

  const newAccessToken = signAccessToken(verified.userId, 'user', verified.telegramId, verified.role);
  const isProd = process.env.NODE_ENV === 'production';

  res.cookie('access_token', newAccessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS * 1000,
  });

  return { userId: verified.userId };
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const accessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const token = accessToken || bearerToken;
  if (!token) {
    return next();
  }

  const payload = verifyAccessToken(token, 'user');
  if (payload) {
    req.userId = payload.userId;
  }

  next();
}

export async function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const token = accessToken || bearerToken;
  if (token) {
    const payload = verifyAccessToken(token, 'admin');
    if (payload) {
      req.userId = payload.userId;
      req.adminActor = payload.userId;
      return next();
    }
  }

  const adminTokenHeader = req.headers['x-admin-token'];
  if (typeof adminTokenHeader === 'string' && ADMIN_TOKEN && adminTokenHeader.length === ADMIN_TOKEN.length) {
    if (crypto.timingSafeEqual(Buffer.from(adminTokenHeader), Buffer.from(ADMIN_TOKEN))) {
      req.adminActor = 'static-admin-token';
      return next();
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      cookies?: Record<string, string>;
      adminActor?: string;
    }
  }
}

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyAccessToken } from '../lib/tokens.js';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

/**
 * Access-token middleware.
 * Refresh-token rotation is handled only by /api/auth/refresh on the client
 * side (single-flight Axios interceptor), never implicitly by every API call.
 * This avoids concurrent requests revoking one another's refresh tokens.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const accessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = accessToken || bearerToken;

  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const payload = verifyAccessToken(token, 'user');
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });

  req.userId = payload.userId;
  return next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const accessToken = req.cookies?.access_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = accessToken || bearerToken;

  if (token) {
    const payload = verifyAccessToken(token, 'user');
    if (payload) req.userId = payload.userId;
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

  // Keep the existing static admin-token integration as a separate fallback.
  const adminTokenHeader = req.headers['x-admin-token'];
  if (
    typeof adminTokenHeader === 'string' &&
    ADMIN_TOKEN &&
    adminTokenHeader.length === ADMIN_TOKEN.length &&
    crypto.timingSafeEqual(Buffer.from(adminTokenHeader), Buffer.from(ADMIN_TOKEN))
  ) {
    req.adminActor = 'static-admin-token';
    return next();
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

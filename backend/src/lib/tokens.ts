import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Request, Response } from 'express';
import { prisma } from './prisma.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('tokens');

function getJwtSecret(): string {
  return process.env.JWT_SECRET as string;
}

function getAdminJwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET as string;
}

function getGuestJwtSecret(): string {
  return process.env.GUEST_JWT_SECRET || process.env.JWT_SECRET as string;
}

export const ACCESS_TOKEN_EXPIRY_SECONDS = 15 * 60;
export const REFRESH_TOKEN_EXPIRY_SECONDS = 14 * 24 * 60 * 60;
export const GUEST_TOKEN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

export type TokenScope = 'user' | 'admin';
export type TokenKind = 'access' | 'refresh';

export interface AccessTokenPayload {
  userId: string;
  telegramId?: string;
  role?: string;
  scope: TokenScope;
  kind: TokenKind;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: string;
  scope: TokenScope;
  kind: TokenKind;
  iat: number;
  exp: number;
  jti?: string;
}

function secretFor(scope: TokenScope): string {
  return scope === 'admin' ? getAdminJwtSecret() : getJwtSecret();
}

export function signAccessToken(userId: string, scope: TokenScope = 'user', telegramId?: string, role?: string): string {
  const payload: AccessTokenPayload = {
    userId,
    scope,
    kind: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_EXPIRY_SECONDS,
  };
  if (telegramId) payload.telegramId = telegramId;
  if (role) payload.role = role;
  return jwt.sign(payload, secretFor(scope), {
    algorithm: 'HS256',
    issuer: 'gab-invest',
  });
}

export function signRefreshToken(userId: string, scope: TokenScope = 'user'): string {
  const payload: RefreshTokenPayload = {
    userId,
    scope,
    kind: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRY_SECONDS,
    jti: crypto.randomUUID(),
  };
  return jwt.sign(payload, secretFor(scope), {
    algorithm: 'HS256',
    issuer: 'gab-invest',
  });
}

export function signGuestToken(clientId: string): string {
  return jwt.sign({ scope: 'guest-leads', clientId }, getGuestJwtSecret(), {
    algorithm: 'HS256',
    expiresIn: GUEST_TOKEN_EXPIRY_SECONDS,
    issuer: 'gab-invest',
  });
}

export function verifyGuestToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, getGuestJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'gab-invest',
    }) as { scope?: string; clientId?: string };
    if (payload.scope !== 'guest-leads' || !payload.clientId || payload.clientId.length > 100) {
      return null;
    }
    return payload.clientId;
  } catch {
    return null;
  }
}

export function verifyAccessToken(token: string, scope: TokenScope = 'user'): AccessTokenPayload | null {
  try {
    const payload = jwt.verify(token, secretFor(scope), {
      algorithms: ['HS256'],
      issuer: 'gab-invest',
    }) as AccessTokenPayload;
    if (payload.kind !== 'access' || payload.scope !== scope) return null;
    return payload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string, scope: TokenScope = 'user'): RefreshTokenPayload | null {
  try {
    const payload = jwt.verify(token, secretFor(scope), {
      algorithms: ['HS256'],
      issuer: 'gab-invest',
    }) as RefreshTokenPayload;
    if (payload.kind !== 'refresh' || payload.scope !== scope) return null;
    return payload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function storeRefreshToken(userId: string, token: string, req: Request): Promise<void> {
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_SECONDS * 1000);
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: req.get('User-Agent') || undefined,
      ipAddress: req.ip || undefined,
    },
  });
}

export async function verifyStoredRefreshToken(token: string, scope: TokenScope = 'user'): Promise<{ userId: string; telegramId?: string; role?: string } | null> {
  const payload = verifyRefreshToken(token, scope);
  if (!payload) return null;

  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, telegramId: true, role: true } } },
  });

  if (!stored || stored.expiresAt < new Date()) {
    return null;
  }

  return {
    userId: payload.userId,
    telegramId: stored.user.telegramId || undefined,
    role: stored.user.role || undefined,
  };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await prisma.refreshToken.deleteMany({ where: { tokenHash } });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  res.cookie('access_token', accessToken, {
    ...baseOptions,
    maxAge: ACCESS_TOKEN_EXPIRY_SECONDS * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    ...baseOptions,
    maxAge: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  const baseOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax' as const,
    path: '/',
  };

  res.clearCookie('access_token', baseOptions);
  res.clearCookie('refresh_token', baseOptions);
}

export async function rotateRefreshToken(
  oldToken: string,
  scope: TokenScope = 'user',
  req?: Request,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const verified = await verifyStoredRefreshToken(oldToken, scope);
  if (!verified) return null;

  await revokeRefreshToken(oldToken);

  const newAccessToken = signAccessToken(verified.userId, scope, verified.telegramId, verified.role);
  const newRefreshToken = signRefreshToken(verified.userId, scope);
  await storeRefreshToken(verified.userId, newRefreshToken, req || ({} as Request));

  logger.info('Refresh token rotated', { userId: verified.userId, scope });
  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((c) => c.trim())
      .filter((c) => c.length > 0)
      .map((c) => {
        const idx = c.indexOf('=');
        if (idx === -1) return [c, ''];
        const name = c.slice(0, idx);
        const value = decodeURIComponent(c.slice(idx + 1));
        return [name, value];
      }),
  );
}

import crypto from 'crypto';

function safeEqual(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  const size = Math.max(a.length, b.length, 1);
  const paddedA = Buffer.alloc(size);
  const paddedB = Buffer.alloc(size);
  a.copy(paddedA);
  b.copy(paddedB);
  return crypto.timingSafeEqual(paddedA, paddedB) && a.length === b.length;
}

/**
 * Inbound bot authentication. BOT_SYNC_SECRET is the active secret;
 * BOT_SYNC_SECRET_PREVIOUS lets the bot rotate without dropping requests.
 */
export function matchesBotSyncSecret(supplied: string | undefined): boolean {
  if (!supplied) return false;
  const active = process.env.BOT_SYNC_SECRET;
  const previous = process.env.BOT_SYNC_SECRET_PREVIOUS;
  const candidates = [active, previous].filter((secret): secret is string => Boolean(secret));
  return candidates.some((secret) => safeEqual(secret, supplied));
}

export function isBotSyncConfigured(): boolean {
  return Boolean(process.env.BOT_SYNC_SECRET || process.env.BOT_SYNC_SECRET_PREVIOUS);
}

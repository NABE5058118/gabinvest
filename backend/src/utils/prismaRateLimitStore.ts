import type { IncrementResponse, Options, Store } from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { createLogger } from './logger.js';

const logger = createLogger('rate-limit-store');

/** Shared rate-limit counters stored in PostgreSQL so multiple API replicas share limits. */
export class PrismaRateLimitStore implements Store {
  readonly localKeys = false;

  constructor(private readonly namespace: string, private readonly windowMs: number) {}

  init(_options: Options): void {
    // Schema is provisioned by the migration before the API starts.
  }

  async increment(key: string): Promise<IncrementResponse> {
    const dbKey = `${this.namespace}:${key}`;
    const rows = await prisma.$queryRaw<Array<{ totalHits: number; resetTime: Date }>>`
      INSERT INTO "RateLimitCounter" ("key", "count", "resetAt")
      VALUES (${dbKey}, 1, NOW() + (${this.windowMs} * INTERVAL '1 millisecond'))
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE
          WHEN "RateLimitCounter"."resetAt" <= NOW() THEN 1
          ELSE "RateLimitCounter"."count" + 1
        END,
        "resetAt" = CASE
          WHEN "RateLimitCounter"."resetAt" <= NOW()
            THEN NOW() + (${this.windowMs} * INTERVAL '1 millisecond')
          ELSE "RateLimitCounter"."resetAt"
        END
      RETURNING "count" AS "totalHits", "resetAt" AS "resetTime"
    `;

    if (!rows[0]) throw new Error('Could not increment rate-limit counter');

    // Opportunistic cleanup of expired counters; this is bounded to avoid one large scan per request.
    if (rows[0].totalHits % 250 === 0) {
      void prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "resetAt" < NOW() - INTERVAL '1 day'`
        .catch((error) => logger.warn('Expired rate-limit counter cleanup failed', error));
    }

    return { totalHits: Number(rows[0].totalHits), resetTime: new Date(rows[0].resetTime) };
  }

  async decrement(key: string): Promise<void> {
    await prisma.$executeRaw`
      UPDATE "RateLimitCounter"
      SET "count" = GREATEST("count" - 1, 0)
      WHERE "key" = ${`${this.namespace}:${key}`}
    `;
  }

  async resetKey(key: string): Promise<void> {
    await prisma.$executeRaw`DELETE FROM "RateLimitCounter" WHERE "key" = ${`${this.namespace}:${key}`}`;
  }
}

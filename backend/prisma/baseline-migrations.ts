import { PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Safety net for databases that already contain the application schema
 * (created before migrations were consolidated into 0_init) but have no
 * _prisma_migrations history table.
 *
 * In that situation `prisma migrate deploy` fails with P3005 and must not be
 * run blindly. This script only baselines the existing database when
 * BASELINE_LEGACY_DB=1 is set explicitly, then marks every migration in the
 * migrations directory as applied so `migrate deploy` can continue with future
 * migrations.
 */

const prisma = new PrismaClient();
const migrationsDir = path.resolve(import.meta.dirname, 'migrations');

async function tableExists(name: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass(${name}) IS NOT NULL AS exists
  `;
  return Boolean(rows[0]?.exists);
}

async function main() {
  if (await tableExists('public._prisma_migrations')) {
    console.info('Migration history found; nothing to baseline.');
    return;
  }

  if (!(await tableExists('public."User"'))) {
    console.info('Empty database; migrations will be applied normally.');
    return;
  }

  if (process.env.BASELINE_LEGACY_DB !== '1') {
    console.error(
      'Database already contains the application schema but has no _prisma_migrations history.',
    );
    console.error(
      'Back up the database, then re-run with BASELINE_LEGACY_DB=1 to mark the existing schema as migrated.',
    );
    process.exitCode = 1;
    return;
  }

  const migrations = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const name of migrations) {
    console.info(`Marking migration as applied: ${name}`);
    execFileSync('npx', ['prisma', 'migrate', 'resolve', '--applied', name], {
      stdio: 'inherit',
      env: process.env,
    });
  }

  console.info('Existing schema baselined; future migrations can be deployed normally.');
}

main()
  .catch((error) => {
    console.error('Could not baseline existing database; migrations were not started.');
    console.error(error instanceof Error ? error.message : 'Unknown database error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

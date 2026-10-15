import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public.attribution') IS NOT NULL AS exists
  `;
  if (!result[0]?.exists) {
    console.info('Legacy attribution table not present; no pre-migration copy needed.');
    return;
  }

  const backupExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public.attribution_legacy_backup') IS NOT NULL AS exists
  `;
  if (backupExists[0]?.exists) {
    console.info('Legacy attribution backup already exists; preserving it unchanged.');
    return;
  }

  await prisma.$executeRawUnsafe(
    'CREATE TABLE public.attribution_legacy_backup AS TABLE public.attribution'
  );
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM public.attribution_legacy_backup
  `;
  console.info(`Preserved ${String(rows[0]?.count ?? 0)} legacy attribution rows before migrations.`);
}

main()
  .catch((error) => {
    console.error('Could not preserve legacy attribution table; migrations were not started.');
    console.error(error instanceof Error ? error.message : 'Unknown database error');
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

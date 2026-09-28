import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gab-invest.ru';
  const adminPhone = process.env.ADMIN_PHONE || '+79000000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID;

  if (adminTelegramId) {
    const existing = await prisma.user.findFirst({
      where: { telegramId: adminTelegramId },
    });

    if (existing) {
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin' },
      });
      console.log('Admin role assigned to telegram user:', updated.telegramId);
      return;
    }

    const user = await prisma.user.create({
      data: {
        telegramId: adminTelegramId,
        firstName: adminFirstName,
        role: 'admin',
      },
    });

    console.log('Admin user created by telegram id:', user.telegramId);
    return;
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: adminEmail }, { phone: adminPhone }] },
  });

  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      firstName: adminFirstName,
      role: 'admin',
    },
  });

  console.log('Admin user created:', admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

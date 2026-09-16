import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gab-invest.ru';
  const adminPhone = process.env.ADMIN_PHONE || '+79000000000';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminFirstName = process.env.ADMIN_FIRST_NAME || 'Admin';

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

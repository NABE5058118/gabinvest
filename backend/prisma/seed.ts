import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.object.createMany({
    data: [
      {
        title: 'БЦ «Азинский»',
        type: 'Офис',
        price: 125000000,
        yieldPercent: 8,
        location: 'Казань, ул. Пушкина, 51',
        city: 'Казань',
        area: 3500,
        roi: 9.5,
        description: 'Современный бизнес-центр класса А в центре города. Развитая инфраструктура, удобная транспортная доступность, высокий спрос на аренду.',
        image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80&fm=webp',
      },
      {
        title: 'ТЦ «Восточный»',
        type: 'Торговое помещение',
        price: 250000000,
        yieldPercent: 10,
        location: 'Москва, ул. Ленина, 10',
        city: 'Москва',
        area: 5000,
        roi: 12,
        description: 'Торговый центр высокого класса в центре города. Высокий пешеходный трафик, якорные арендаторы.',
        image: 'https://images.unsplash.com/photo-1604014237800-1c9106c0b2b3?w=800&q=80&fm=webp',
      },
      {
        title: 'Складской комплекс «Логистик»',
        type: 'Склад',
        price: 95000000,
        yieldPercent: 12,
        location: 'Казань, ул. Промышленная, 25',
        city: 'Казань',
        area: 8000,
        roi: 10,
        description: 'Современный складской комплекс с рампой, высокими потолками и удобной транспортной развязкой.',
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80&fm=webp',
      },
      {
        title: 'Офисный центр «Горизонт»',
        type: 'Офис',
        price: 180000000,
        yieldPercent: 9,
        location: 'Москва, ул. Мира, 45',
        city: 'Москва',
        area: 4200,
        roi: 8.5,
        description: 'Офисный центр премиум-класса с панорамным остеклением и собственной инфраструктурой.',
        image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&q=80&fm=webp',
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/**
 * Prisma Seed — заполнение начальных данных
 * 🔥 FLOW I-PAYOUT: Заполняем payoutPercent для всех инструментов
 */

import { PrismaClient } from '@prisma/client';
import { INSTRUMENTS } from '../src/config/instruments.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 🔥 FLOW I-PAYOUT: Заполняем payoutPercent для всех инструментов
  for (const [id, config] of Object.entries(INSTRUMENTS)) {
    // Генерируем случайную доходность в диапазоне 60–90%
    const payoutPercent = 60 + Math.floor(Math.random() * 31); // 60–90

    await prisma.instrument.upsert({
      where: { id },
      update: {
        payoutPercent,
      },
      create: {
        id,
        name: `${config.base} / ${config.quote}`,
        base: config.base,
        quote: config.quote,
        payoutPercent,
        isActive: true,
      },
    });

    console.log(`✅ ${id}: ${payoutPercent}%`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

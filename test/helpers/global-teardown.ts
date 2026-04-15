import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

export default async function globalTeardown(): Promise<void> {
  config({ path: '.env' });

  const connectionString = process.env['DATABASE_URL_TEST'];

  if (connectionString) {
    const adapter = new PrismaPg({ connectionString });
    const prisma = new PrismaClient({ adapter });
    await prisma.$disconnect();
  }

  console.log('\n🧹 Nettoyage terminé');
}
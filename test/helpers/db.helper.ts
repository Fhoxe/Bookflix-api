import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

config({ path: '.env' });

let prisma: PrismaClient | null = null;

export function getTestPrisma(): PrismaClient {
  if (!prisma) {
    const connectionString = process.env['DATABASE_URL_TEST'];

    if (!connectionString) {
      throw new Error('DATABASE_URL_TEST non défini dans le .env');
    }

    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({ adapter });
  }
  return prisma;
}

export async function cleanDatabase(): Promise<void> {
  const client = getTestPrisma();

  await client.review.deleteMany();
  await client.userBook.deleteMany();
  await client.book.deleteMany();
  await client.user.deleteMany();
}
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { axiosInstance } from './seed-helpers.js';

// ─── Configuration ────────────────────────────────────────────────

const GENRES = [
  'Fiction',
  'Science',
  'Histoire',
  'Technologie',
  'Biographie',
  'Philosophie',
  'Art',
  'Cuisine',
  'Voyage',
  'Musique',
  'Psychologie',
  'Économie',
  'Politique',
  'Religion',
  'Sport',
];

const MAX_RESULTS_PER_GENRE = 40;
const DELAY_BETWEEN_REQUESTS_MS = 500;

// ─── Helpers ──────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    categories?: string[];
    imageLinks?: { thumbnail?: string };
    industryIdentifiers?: Array<{ type: string; identifier: string }>;
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

const mapVolume = (volume: GoogleBooksVolume, genre: string) => {
  const { volumeInfo } = volume;

  const isbn = volumeInfo.industryIdentifiers?.find(
    (id) => id.type === 'ISBN_13' || id.type === 'ISBN_10',
  )?.identifier;

  const publishedYear = volumeInfo.publishedDate
    ? parseInt(volumeInfo.publishedDate.substring(0, 4), 10)
    : undefined;

  return {
    googleBooksId: volume.id,
    title: volumeInfo.title,
    authors: volumeInfo.authors?.join(', ') ?? 'Auteur inconnu',
    description: volumeInfo.description,
    publishedYear: isNaN(publishedYear ?? NaN) ? undefined : publishedYear,
    genre,
    coverUrl: volumeInfo.imageLinks?.thumbnail,
    isbn,
  };
};

// ─── Main ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];

  if (!connectionString) {
    throw new Error('DATABASE_URL non défini dans les variables d\'environnement');
  }

  const apiKey = process.env['GOOGLE_BOOKS_API_KEY'];
  const apiUrl = process.env['GOOGLE_BOOKS_API_URL'] ?? 'https://www.googleapis.com/books/v1';

  if (!apiKey) {
    throw new Error('GOOGLE_BOOKS_API_KEY non défini dans les variables d\'environnement');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🌱 Démarrage du seed BookFlix...\n');

  let totalUpserted = 0;
  let totalErrors = 0;

  for (const genre of GENRES) {
    console.log(`📚 Récupération des livres — genre : ${genre}`);

    try {
      const response = await axiosInstance.get<GoogleBooksResponse>(
        `${apiUrl}/volumes`,
        {
          params: {
            q: `subject:${genre}`,
            maxResults: MAX_RESULTS_PER_GENRE,
            key: apiKey,
            langRestrict: 'fr',
          },
        },
      );

      const items = response.data.items ?? [];
      console.log(`   → ${items.length} livres trouvés`);

      for (const item of items) {
        const mapped = mapVolume(item, genre);

        try {
          await prisma.book.upsert({
            where: { googleBooksId: mapped.googleBooksId },
            update: {
              title: mapped.title,
              authors: mapped.authors,
              description: mapped.description,
              publishedYear: mapped.publishedYear,
              genre: mapped.genre,
              coverUrl: mapped.coverUrl,
              lastSyncedAt: new Date(),
            },
            create: {
              googleBooksId: mapped.googleBooksId,
              title: mapped.title,
              authors: mapped.authors,
              description: mapped.description,
              publishedYear: mapped.publishedYear,
              genre: mapped.genre,
              coverUrl: mapped.coverUrl,
              isbn: mapped.isbn,
            },
          });

          totalUpserted++;
        } catch (bookError) {
          console.error(`   ⚠️  Erreur sur le livre "${mapped.title}" : ${bookError}`);
          totalErrors++;
        }
      }

      console.log(`   ✅ Genre "${genre}" terminé\n`);
    } catch (genreError) {
      console.error(`   ❌ Erreur pour le genre "${genre}" : ${genreError}\n`);
      totalErrors++;
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS);
  }

  console.log('─────────────────────────────────────');
  console.log(`✅ Seed terminé !`);
  console.log(`   Livres upsertés : ${totalUpserted}`);
  console.log(`   Erreurs : ${totalErrors}`);
  console.log('─────────────────────────────────────');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('❌ Erreur fatale durant le seed :', error);
  process.exit(1);
});
import { execSync } from 'child_process';
import { config } from 'dotenv';

export default async function globalSetup(): Promise<void> {
  config({ path: '.env' });

  console.log('\n🔧 Initialisation de la base de données de test...');

  const testDbUrl = process.env['DATABASE_URL_TEST'];

  if (!testDbUrl) {
    throw new Error('DATABASE_URL_TEST non défini dans le .env');
  }

  process.env['DATABASE_URL'] = testDbUrl;

  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: testDbUrl,
    },
    stdio: 'inherit',
  });

  console.log('✅ Base de données de test prête\n');
}
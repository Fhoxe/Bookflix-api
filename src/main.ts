import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Validation globale (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // Supprime les champs non décorés
      forbidNonWhitelisted: true, // Erreur si champs inconnus
      transform: true,        // Transforme les types automatiquement
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;

  await app.listen(port);
  console.log(`🚀 BookFlix API démarrée sur http://localhost:${port}/graphql`);
}

void bootstrap();
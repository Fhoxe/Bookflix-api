import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { Resolver, Query } from '@nestjs/graphql';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BooksModule } from './books/books.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { UsersModule } from './users/users.module.js';
import { GqlThrottlerGuard } from './auth/guards/throttler.guard.js';

@Resolver()
class HealthResolver {
  @Query(() => String)
  healthcheck(): string {
    return 'BookFlix API is up 🚀';
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ([{
        ttl: configService.get<number>('THROTTLE_TTL') ?? 900000,
        limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
      }]),
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.graphql'),
      sortSchema: true,
      playground: false,
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),

    PrismaModule,
    AuthModule,
    BooksModule,
    CollectionModule,
    ReviewsModule,
    UsersModule,
  ],
  providers: [
    HealthResolver,
    {
      provide: APP_GUARD,
      useClass: GqlThrottlerGuard,
    },
  ],
})
export class AppModule {}
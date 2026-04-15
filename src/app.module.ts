import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Resolver, Query } from '@nestjs/graphql';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BooksModule } from './books/books.module.js';
import { CollectionModule } from './collection/collection.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { UsersModule } from './users/users.module.js';

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
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'schema.graphql'),
      sortSchema: true,
      playground: false,
      context: ({ req }: { req: Request }) => ({ req }),
    }),
    PrismaModule,
    AuthModule,
    BooksModule,
    CollectionModule,
    ReviewsModule,
    UsersModule,
  ],
  providers: [HealthResolver],
})
export class AppModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Resolver, Query } from '@nestjs/graphql';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module.js';

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
  ],
  providers: [HealthResolver],
})
export class AppModule {}
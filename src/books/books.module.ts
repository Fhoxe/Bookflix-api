import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BooksResolver } from './books.resolver.js';
import { BooksService } from './books.service.js';
import { BooksRepository } from './books.repository.js';
import { GoogleBooksService } from './google-books.service.js';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [
    BooksResolver,
    BooksService,
    BooksRepository,
    GoogleBooksService,
  ],
  exports: [BooksService],
})
export class BooksModule {}
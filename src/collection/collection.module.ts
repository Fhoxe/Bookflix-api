import { Module } from '@nestjs/common';
import { CollectionResolver } from './collection.resolver.js';
import { CollectionService } from './collection.service.js';
import { CollectionRepository } from './collection.repository.js';
import { BooksModule } from '../books/books.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [BooksModule, UsersModule],
  providers: [
    CollectionResolver,
    CollectionService,
    CollectionRepository,
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
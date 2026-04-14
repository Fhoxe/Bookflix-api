import { Module } from '@nestjs/common';
import { CollectionResolver } from './collection.resolver.js';
import { CollectionService } from './collection.service.js';
import { CollectionRepository } from './collection.repository.js';
import { BooksModule } from '../books/books.module.js';
import { UsersService } from '../users/users.service.js';

@Module({
  imports: [BooksModule],
  providers: [
    CollectionResolver,
    CollectionService,
    CollectionRepository,
    UsersService,
  ],
  exports: [CollectionService],
})
export class CollectionModule {}
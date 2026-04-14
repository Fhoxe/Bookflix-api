import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { BookType } from './dto/book.type.js';
import { SearchBooksInput } from './dto/search-books.input.js';
import { CreateBookInput } from './dto/create-book.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';

@Resolver(() => BookType)
@UseGuards(JwtAuthGuard)
export class BooksResolver {
  constructor(private readonly booksService: BooksService) {}

  @Query(() => [BookType])
  async searchBooks(
    @Args('input') input: SearchBooksInput,
  ): Promise<BookType[]> {
    return this.booksService.searchBooks(input);
  }

  @Query(() => [BookType])
  async books(
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<BookType[]> {
    return this.booksService.findAll(page, limit);
  }

  @Query(() => BookType)
  async book(@Args('id') id: string): Promise<BookType> {
    return this.booksService.findById(id);
  }

  @Query(() => [BookType])
  async booksByGenre(
    @Args('genre') genre: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<BookType[]> {
    return this.booksService.findByGenre(genre, page, limit);
  }

  @Mutation(() => BookType)
  async createBook(
    @Args('input') input: CreateBookInput,
  ): Promise<BookType> {
    return this.booksService.createBook(input);
  }
}
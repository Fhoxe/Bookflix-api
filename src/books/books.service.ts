import { Injectable, NotFoundException } from '@nestjs/common';
import { Book } from '@prisma/client';
import { BooksRepository } from './books.repository.js';
import { GoogleBooksService } from './google-books.service.js';
import { SearchBooksInput } from './dto/search-books.input.js';
import { CreateBookInput } from './dto/create-book.input.js';
import { BookType } from './dto/book.type.js';
import { PaginatedBooksType } from './dto/paginated-books.type.js';
import { buildPaginationMeta } from '../common/helpers/pagination.helper.js';

@Injectable()
export class BooksService {
  constructor(
    private readonly booksRepository: BooksRepository,
    private readonly googleBooksService: GoogleBooksService,
  ) {}

  async searchBooks(input: SearchBooksInput): Promise<PaginatedBooksType> {
    const results = await this.googleBooksService.searchBooks(
      input.query,
      input.maxResults ?? 10,
      input.genre,
    );

    const upsertedBooks = await Promise.all(
      results.map((book) => this.booksRepository.upsertFromGoogle(book)),
    );

    const items = await Promise.all(
      upsertedBooks.map((book) => this.toBookType(book)),
    );

    return {
      items,
      ...buildPaginationMeta(items.length, 1, items.length || 1),
    };
  }

  async findAll(page: number, limit: number): Promise<PaginatedBooksType> {
    const [books, total] = await Promise.all([
      this.booksRepository.findAll(page, limit),
      this.booksRepository.countAll(),
    ]);

    const items = await Promise.all(books.map((book) => this.toBookType(book)));

    return {
      items,
      ...buildPaginationMeta(total, page, limit),
    };
  }

  async findById(id: string): Promise<BookType> {
    const book = await this.booksRepository.findById(id);

    if (!book) {
      throw new NotFoundException(`Livre introuvable avec l'id : ${id}`);
    }

    return this.toBookType(book);
  }

  async findByGenre(
    genre: string,
    page: number,
    limit: number,
  ): Promise<PaginatedBooksType> {
    const [books, total] = await Promise.all([
      this.booksRepository.findByGenre(genre, page, limit),
      this.booksRepository.countByGenre(genre),
    ]);

    const items = await Promise.all(books.map((book) => this.toBookType(book)));

    return {
      items,
      ...buildPaginationMeta(total, page, limit),
    };
  }

  async countAll(): Promise<number> {
    return this.booksRepository.countAll();
  }

  async countByGenre(genre: string): Promise<number> {
    return this.booksRepository.countByGenre(genre);
  }

  async createBook(input: CreateBookInput): Promise<BookType> {
    const book = await this.booksRepository.create(input);
    return this.toBookType(book);
  }

  private async toBookType(book: Book): Promise<BookType> {
    const [averageRating, reviewCount] = await Promise.all([
      this.booksRepository.getAverageRating(book.id),
      this.booksRepository.getReviewCount(book.id),
    ]);

    return {
      id: book.id,
      title: book.title,
      authors: book.authors,
      lastSyncedAt: book.lastSyncedAt,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      reviewCount,
      averageRating: averageRating ?? undefined,
      googleBooksId: book.googleBooksId ?? undefined,
      description: book.description ?? undefined,
      publishedYear: book.publishedYear ?? undefined,
      genre: book.genre ?? undefined,
      coverUrl: book.coverUrl ?? undefined,
      isbn: book.isbn ?? undefined,
    };
  }
}
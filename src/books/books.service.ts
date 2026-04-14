import { Injectable, NotFoundException } from '@nestjs/common';
import { Book } from '@prisma/client';
import { BooksRepository } from './books.repository.js';
import { GoogleBooksService } from './google-books.service.js';
import { SearchBooksInput } from './dto/search-books.input.js';
import { CreateBookInput } from './dto/create-book.input.js';
import { BookType } from './dto/book.type.js';

@Injectable()
export class BooksService {
  constructor(
    private readonly booksRepository: BooksRepository,
    private readonly googleBooksService: GoogleBooksService,
  ) {}

  async searchBooks(input: SearchBooksInput): Promise<BookType[]> {
    const results = await this.googleBooksService.searchBooks(
      input.query,
      input.maxResults ?? 10,
      input.genre,
    );

    const upsertedBooks = await Promise.all(
      results.map((book) => this.booksRepository.upsertFromGoogle(book)),
    );

    return upsertedBooks.map(this.toBookType);
  }

  async findAll(page: number, limit: number): Promise<BookType[]> {
    const books = await this.booksRepository.findAll(page, limit);
    return books.map(this.toBookType);
  }

  async findById(id: string): Promise<BookType> {
    const book = await this.booksRepository.findById(id);

    if (!book) {
      throw new NotFoundException(`Livre introuvable avec l'id : ${id}`);
    }

    return this.toBookType(book);
  }

  async findByGenre(genre: string, page: number, limit: number): Promise<BookType[]> {
    const books = await this.booksRepository.findByGenre(genre, page, limit);
    return books.map(this.toBookType);
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

  private toBookType(book: Book): BookType {
    return {
      id: book.id,
      title: book.title,
      authors: book.authors,
      lastSyncedAt: book.lastSyncedAt,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      googleBooksId: book.googleBooksId ?? undefined,
      description: book.description ?? undefined,
      publishedYear: book.publishedYear ?? undefined,
      genre: book.genre ?? undefined,
      coverUrl: book.coverUrl ?? undefined,
      isbn: book.isbn ?? undefined,
    };
  }
}
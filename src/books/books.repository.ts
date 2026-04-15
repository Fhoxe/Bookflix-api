import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Book } from '@prisma/client';
import { MappedBook } from './google-books.service.js';
import { CreateBookInput } from './dto/create-book.input.js';

@Injectable()
export class BooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Book | null> {
    return this.prisma.book.findUnique({ where: { id } });
  }

  async findAll(page: number, limit: number): Promise<Book[]> {
    return this.prisma.book.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByGenre(genre: string, page: number, limit: number): Promise<Book[]> {
    return this.prisma.book.findMany({
      where: {
        genre: {
          contains: genre,
          mode: 'insensitive',
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.book.count();
  }

  async countByGenre(genre: string): Promise<number> {
    return this.prisma.book.count({
      where: {
        genre: {
          contains: genre,
          mode: 'insensitive',
        },
      },
    });
  }

  async getAverageRating(bookId: string): Promise<number | null> {
    const result = await this.prisma.review.aggregate({
      where: { bookId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    if (result._count.rating === 0) return null;

    const avg = result._avg.rating;
    if (avg === null) return null;

    return Math.round(avg * 10) / 10;
  }

  async getReviewCount(bookId: string): Promise<number> {
    return this.prisma.review.count({ where: { bookId } });
  }

  async upsertFromGoogle(book: MappedBook): Promise<Book> {
    return this.prisma.book.upsert({
      where: { googleBooksId: book.googleBooksId },
      update: {
        title: book.title,
        authors: book.authors,
        description: book.description,
        publishedYear: book.publishedYear,
        genre: book.genre,
        coverUrl: book.coverUrl,
        lastSyncedAt: new Date(),
      },
      create: {
        googleBooksId: book.googleBooksId,
        title: book.title,
        authors: book.authors,
        description: book.description,
        publishedYear: book.publishedYear,
        genre: book.genre,
        coverUrl: book.coverUrl,
        isbn: book.isbn,
      },
    });
  }

  async create(input: CreateBookInput): Promise<Book> {
    return this.prisma.book.create({ data: input });
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Review } from '@prisma/client';
import { CreateReviewInput } from './dto/create-review.input.js';
import { UpdateReviewInput } from './dto/update-review.input.js';

export type ReviewWithBook = Review & {
  book: {
    id: string;
    googleBooksId: string | null;
    title: string;
    authors: string;
    description: string | null;
    publishedYear: number | null;
    genre: string | null;
    coverUrl: string | null;
    isbn: string | null;
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
};

@Injectable()
export class ReviewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({ where: { id } });
  }

  async findByBookId(
    bookId: string,
    page: number,
    limit: number,
  ): Promise<ReviewWithBook[]> {
    return this.prisma.review.findMany({
      where: { bookId },
      include: { book: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ReviewWithBook[]>;
  }

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ReviewWithBook[]> {
    return this.prisma.review.findMany({
      where: { userId },
      include: { book: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }) as Promise<ReviewWithBook[]>;
  }

  async findByUserIdAndBookId(
    userId: string,
    bookId: string,
  ): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
  }

  async countByBookId(bookId: string): Promise<number> {
    return this.prisma.review.count({ where: { bookId } });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.review.count({ where: { userId } });
  }

  async create(userId: string, input: CreateReviewInput): Promise<Review> {
    return this.prisma.review.create({
      data: {
        userId,
        bookId: input.bookId,
        rating: input.rating,
        comment: input.comment,
      },
    });
  }

  async update(id: string, input: UpdateReviewInput): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.comment !== undefined && { comment: input.comment }),
      },
    });
  }

  async delete(id: string): Promise<Review> {
    return this.prisma.review.delete({ where: { id } });
  }
}
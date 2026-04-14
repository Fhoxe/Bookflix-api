import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UserBook, ReadingStatus } from '@prisma/client';

export type UserBookWithBook = UserBook & {
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
export class CollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(
    userId: string,
    page: number,
    limit: number,
    status?: ReadingStatus,
  ): Promise<UserBookWithBook[]> {
    return this.prisma.userBook.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: { book: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
    }) as Promise<UserBookWithBook[]>;
  }

  async findByUserIdAndBookId(
    userId: string,
    bookId: string,
  ): Promise<UserBook | null> {
    return this.prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
    });
  }

  async countByUserId(userId: string, status?: ReadingStatus): Promise<number> {
    return this.prisma.userBook.count({
      where: {
        userId,
        ...(status && { status }),
      },
    });
  }

  async add(
    userId: string,
    bookId: string,
    status: ReadingStatus,
  ): Promise<UserBook> {
    return this.prisma.userBook.create({
      data: { userId, bookId, status },
    });
  }

  async updateStatus(
    userId: string,
    bookId: string,
    status: ReadingStatus,
  ): Promise<UserBook> {
    return this.prisma.userBook.update({
      where: { userId_bookId: { userId, bookId } },
      data: { status },
    });
  }

  async remove(userId: string, bookId: string): Promise<UserBook> {
    return this.prisma.userBook.delete({
      where: { userId_bookId: { userId, bookId } },
    });
  }
}
import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { UserBook, ReadingStatus } from '@prisma/client';
import { CollectionRepository, UserBookWithBook } from './collection.repository.js';
import { BooksService } from '../books/books.service.js';
import { AddToCollectionInput } from './dto/add-to-collection.input.js';
import { UpdateCollectionStatusInput } from './dto/update-collection-status.input.js';
import { UserBookType } from './dto/user-book.type.js';
import { BookType } from '../books/dto/book.type.js';

@Injectable()
export class CollectionService {
  constructor(
    private readonly collectionRepository: CollectionRepository,
    private readonly booksService: BooksService,
  ) {}

  async addToCollection(
    userId: string,
    input: AddToCollectionInput,
  ): Promise<UserBookType> {
    await this.booksService.findById(input.bookId);

    const existing = await this.collectionRepository.findByUserIdAndBookId(
      userId,
      input.bookId,
    );

    if (existing) {
      throw new ConflictException('Ce livre est déjà dans votre collection');
    }

    const userBook = await this.collectionRepository.add(
      userId,
      input.bookId,
      input.status ?? ReadingStatus.TO_READ,
    );

    return this.toUserBookType(userBook);
  }

  async updateStatus(
    userId: string,
    input: UpdateCollectionStatusInput,
  ): Promise<UserBookType> {
    const existing = await this.collectionRepository.findByUserIdAndBookId(
      userId,
      input.bookId,
    );

    if (!existing) {
      throw new NotFoundException('Ce livre n\'est pas dans votre collection');
    }

    const userBook = await this.collectionRepository.updateStatus(
      userId,
      input.bookId,
      input.status,
    );

    return this.toUserBookType(userBook);
  }

  async removeFromCollection(
    userId: string,
    bookId: string,
  ): Promise<UserBookType> {
    const existing = await this.collectionRepository.findByUserIdAndBookId(
      userId,
      bookId,
    );

    if (!existing) {
      throw new NotFoundException('Ce livre n\'est pas dans votre collection');
    }

    const userBook = await this.collectionRepository.remove(userId, bookId);
    return this.toUserBookType(userBook);
  }

  async getMyCollection(
    userId: string,
    page: number,
    limit: number,
    status?: ReadingStatus,
  ): Promise<UserBookType[]> {
    const userBooks = await this.collectionRepository.findByUserId(
      userId,
      page,
      limit,
      status,
    );

    return userBooks.map((ub) => this.toUserBookType(ub));
  }

  async getUserCollection(
    requesterId: string,
    targetUserId: string,
    page: number,
    limit: number,
    status?: ReadingStatus,
    isTargetPublic?: boolean,
  ): Promise<UserBookType[]> {
    if (requesterId !== targetUserId && !isTargetPublic) {
      throw new ForbiddenException(
        'Ce profil est privé',
      );
    }

    const userBooks = await this.collectionRepository.findByUserId(
      targetUserId,
      page,
      limit,
      status,
    );

    return userBooks.map((ub) => this.toUserBookType(ub));
  }

  async getEntryByBookId(
    userId: string,
    bookId: string,
  ): Promise<UserBook | null> {
    return this.collectionRepository.findByUserIdAndBookId(userId, bookId);
  }

  private toUserBookType(userBook: UserBook | UserBookWithBook): UserBookType {
    const bookType: BookType | undefined =
      'book' in userBook
        ? {
            id: userBook.book.id,
            title: userBook.book.title,
            authors: userBook.book.authors,
            lastSyncedAt: userBook.book.lastSyncedAt,
            createdAt: userBook.book.createdAt,
            updatedAt: userBook.book.updatedAt,
            googleBooksId: userBook.book.googleBooksId ?? undefined,
            description: userBook.book.description ?? undefined,
            publishedYear: userBook.book.publishedYear ?? undefined,
            genre: userBook.book.genre ?? undefined,
            coverUrl: userBook.book.coverUrl ?? undefined,
            isbn: userBook.book.isbn ?? undefined,
          }
        : undefined;

    return {
      id: userBook.id,
      status: userBook.status,
      userId: userBook.userId,
      bookId: userBook.bookId,
      createdAt: userBook.createdAt,
      updatedAt: userBook.updatedAt,
      book: bookType,
    };
  }
}
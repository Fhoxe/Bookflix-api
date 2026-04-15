import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Review, ReadingStatus } from '@prisma/client';
import { ReviewsRepository, ReviewWithBook } from './reviews.repository.js';
import { CollectionService } from '../collection/collection.service.js';
import { CreateReviewInput } from './dto/create-review.input.js';
import { UpdateReviewInput } from './dto/update-review.input.js';
import { ReviewType } from './dto/review.type.js';
import { PaginatedReviewsType } from './dto/paginated-reviews.type.js';
import { BookType } from '../books/dto/book.type.js';
import { buildPaginationMeta } from '../common/helpers/pagination.helper.js';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly collectionService: CollectionService,
  ) {}

  async createReview(
    userId: string,
    input: CreateReviewInput,
  ): Promise<ReviewType> {
    const collectionEntry = await this.collectionService.getEntryByBookId(
      userId,
      input.bookId,
    );

    if (!collectionEntry) {
      throw new BadRequestException(
        'Vous devez ajouter ce livre à votre collection avant de le noter',
      );
    }

    if (collectionEntry.status !== ReadingStatus.READ) {
      throw new BadRequestException(
        'Vous devez avoir lu ce livre avant de le noter',
      );
    }

    const existing = await this.reviewsRepository.findByUserIdAndBookId(
      userId,
      input.bookId,
    );

    if (existing) {
      throw new ConflictException('Vous avez déjà noté ce livre');
    }

    const review = await this.reviewsRepository.create(userId, input);
    return this.toReviewType(review);
  }

  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput,
  ): Promise<ReviewType> {
    const review = await this.reviewsRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review introuvable');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez modifier que vos propres reviews',
      );
    }

    const updatedReview = await this.reviewsRepository.update(reviewId, input);
    return this.toReviewType(updatedReview);
  }

  async deleteReview(userId: string, reviewId: string): Promise<ReviewType> {
    const review = await this.reviewsRepository.findById(reviewId);

    if (!review) {
      throw new NotFoundException('Review introuvable');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException(
        'Vous ne pouvez supprimer que vos propres reviews',
      );
    }

    const deletedReview = await this.reviewsRepository.delete(reviewId);
    return this.toReviewType(deletedReview);
  }

  async getBookReviews(
    bookId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedReviewsType> {
    const [reviews, total] = await Promise.all([
      this.reviewsRepository.findByBookId(bookId, page, limit),
      this.reviewsRepository.countByBookId(bookId),
    ]);

    return {
      items: reviews.map((review) => this.toReviewType(review)),
      ...buildPaginationMeta(total, page, limit),
    };
  }

  async getUserReviews(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedReviewsType> {
    const [reviews, total] = await Promise.all([
      this.reviewsRepository.findByUserId(userId, page, limit),
      this.reviewsRepository.countByUserId(userId),
    ]);

    return {
      items: reviews.map((review) => this.toReviewType(review)),
      ...buildPaginationMeta(total, page, limit),
    };
  }

  private toReviewType(review: Review | ReviewWithBook): ReviewType {
    const bookType: BookType | undefined =
      'book' in review
        ? {
            id: review.book.id,
            title: review.book.title,
            authors: review.book.authors,
            lastSyncedAt: review.book.lastSyncedAt,
            createdAt: review.book.createdAt,
            updatedAt: review.book.updatedAt,
            googleBooksId: review.book.googleBooksId ?? undefined,
            description: review.book.description ?? undefined,
            publishedYear: review.book.publishedYear ?? undefined,
            genre: review.book.genre ?? undefined,
            coverUrl: review.book.coverUrl ?? undefined,
            isbn: review.book.isbn ?? undefined,
          }
        : undefined;

    return {
      id: review.id,
      rating: review.rating,
      userId: review.userId,
      bookId: review.bookId,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      comment: review.comment ?? undefined,
      book: bookType,
    };
  }
}
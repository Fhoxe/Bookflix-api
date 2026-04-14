import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReadingStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service.js';
import { ReviewsRepository } from './reviews.repository.js';
import { CollectionService } from '../collection/collection.service.js';
import { CreateReviewInput } from './dto/create-review.input.js';
import { UpdateReviewInput } from './dto/update-review.input.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockBook = {
  id: 'book-uuid-123',
  googleBooksId: 'google-123',
  title: 'Clean Code',
  authors: 'Robert C. Martin',
  description: 'Un livre sur le code propre',
  publishedYear: 2008,
  genre: 'Informatique',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '9780132350884',
  lastSyncedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReview = {
  id: 'review-uuid-123',
  userId: 'user-uuid-123',
  bookId: 'book-uuid-123',
  rating: 5,
  comment: 'Excellent livre !',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockReviewWithBook = {
  ...mockReview,
  book: mockBook,
};

const mockReviewType = {
  id: 'review-uuid-123',
  userId: 'user-uuid-123',
  bookId: 'book-uuid-123',
  rating: 5,
  comment: 'Excellent livre !',
  createdAt: mockReview.createdAt,
  updatedAt: mockReview.updatedAt,
  book: undefined,
};

const mockCollectionEntryRead = {
  id: 'userbook-uuid-123',
  userId: 'user-uuid-123',
  bookId: 'book-uuid-123',
  status: ReadingStatus.READ,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCollectionEntryReading = {
  ...mockCollectionEntryRead,
  status: ReadingStatus.READING,
};

const mockCreateReviewInput: CreateReviewInput = {
  bookId: 'book-uuid-123',
  rating: 5,
  comment: 'Excellent livre !',
};

const mockUpdateReviewInput: UpdateReviewInput = {
  rating: 4,
  comment: 'Très bon livre !',
};

const mockReviewsRepository = {
  findById: jest.fn(),
  findByBookId: jest.fn(),
  findByUserId: jest.fn(),
  findByUserIdAndBookId: jest.fn(),
  countByBookId: jest.fn(),
  countByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockCollectionService = {
  getEntryByBookId: jest.fn(),
};

const repositoryError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('ReviewsService', () => {
  let reviewsService: ReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: ReviewsRepository, useValue: mockReviewsRepository },
        { provide: CollectionService, useValue: mockCollectionService },
      ],
    }).compile();

    reviewsService = module.get<ReviewsService>(ReviewsService);
    jest.clearAllMocks();
  });

  // ─── createReview ───────────────────────────────────────────────

  describe('createReview', () => {
    it('devrait créer une review et retourner un ReviewType', async () => {
      mockCollectionService.getEntryByBookId.mockResolvedValue(
        mockCollectionEntryRead,
      );
      mockReviewsRepository.findByUserIdAndBookId.mockResolvedValue(null);
      mockReviewsRepository.create.mockResolvedValue(mockReview);

      const result = await reviewsService.createReview(
        'user-uuid-123',
        mockCreateReviewInput,
      );

      expect(result).toEqual(mockReviewType);
      expect(mockReviewsRepository.create).toHaveBeenCalledWith(
        'user-uuid-123',
        mockCreateReviewInput,
      );
      expect(mockReviewsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une BadRequestException si le livre n\'est pas dans la collection', async () => {
      mockCollectionService.getEntryByBookId.mockResolvedValue(null);

      await expect(
        reviewsService.createReview('user-uuid-123', mockCreateReviewInput),
      ).rejects.toThrow(BadRequestException);

      expect(mockReviewsRepository.create).not.toHaveBeenCalled();
    });

    it('devrait lever une BadRequestException si le statut n\'est pas READ', async () => {
      mockCollectionService.getEntryByBookId.mockResolvedValue(
        mockCollectionEntryReading,
      );

      await expect(
        reviewsService.createReview('user-uuid-123', mockCreateReviewInput),
      ).rejects.toThrow(BadRequestException);

      expect(mockReviewsRepository.create).not.toHaveBeenCalled();
    });

    it('devrait lever une ConflictException si une review existe déjà', async () => {
      mockCollectionService.getEntryByBookId.mockResolvedValue(
        mockCollectionEntryRead,
      );
      mockReviewsRepository.findByUserIdAndBookId.mockResolvedValue(mockReview);

      await expect(
        reviewsService.createReview('user-uuid-123', mockCreateReviewInput),
      ).rejects.toThrow(ConflictException);

      expect(mockReviewsRepository.create).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionService.getEntryByBookId.mockResolvedValue(
        mockCollectionEntryRead,
      );
      mockReviewsRepository.findByUserIdAndBookId.mockResolvedValue(null);
      mockReviewsRepository.create.mockRejectedValue(repositoryError);

      await expect(
        reviewsService.createReview('user-uuid-123', mockCreateReviewInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── updateReview ───────────────────────────────────────────────

  describe('updateReview', () => {
    it('devrait mettre à jour une review et retourner un ReviewType', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.update.mockResolvedValue({
        ...mockReview,
        rating: 4,
        comment: 'Très bon livre !',
      });

      const result = await reviewsService.updateReview(
        'user-uuid-123',
        'review-uuid-123',
        mockUpdateReviewInput,
      );

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Très bon livre !');
      expect(mockReviewsRepository.update).toHaveBeenCalledWith(
        'review-uuid-123',
        mockUpdateReviewInput,
      );
      expect(mockReviewsRepository.update).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si la review est introuvable', async () => {
      mockReviewsRepository.findById.mockResolvedValue(null);

      await expect(
        reviewsService.updateReview(
          'user-uuid-123',
          'review-uuid-inexistant',
          mockUpdateReviewInput,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(mockReviewsRepository.update).not.toHaveBeenCalled();
    });

    it('devrait lever une ForbiddenException si l\'utilisateur n\'est pas le propriétaire', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);

      await expect(
        reviewsService.updateReview(
          'autre-user-uuid',
          'review-uuid-123',
          mockUpdateReviewInput,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReviewsRepository.update).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.update.mockRejectedValue(repositoryError);

      await expect(
        reviewsService.updateReview(
          'user-uuid-123',
          'review-uuid-123',
          mockUpdateReviewInput,
        ),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── deleteReview ───────────────────────────────────────────────

  describe('deleteReview', () => {
    it('devrait supprimer une review et retourner un ReviewType', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.delete.mockResolvedValue(mockReview);

      const result = await reviewsService.deleteReview(
        'user-uuid-123',
        'review-uuid-123',
      );

      expect(result).toEqual(mockReviewType);
      expect(mockReviewsRepository.delete).toHaveBeenCalledWith(
        'review-uuid-123',
      );
      expect(mockReviewsRepository.delete).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si la review est introuvable', async () => {
      mockReviewsRepository.findById.mockResolvedValue(null);

      await expect(
        reviewsService.deleteReview('user-uuid-123', 'review-uuid-inexistant'),
      ).rejects.toThrow(NotFoundException);

      expect(mockReviewsRepository.delete).not.toHaveBeenCalled();
    });

    it('devrait lever une ForbiddenException si l\'utilisateur n\'est pas le propriétaire', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);

      await expect(
        reviewsService.deleteReview('autre-user-uuid', 'review-uuid-123'),
      ).rejects.toThrow(ForbiddenException);

      expect(mockReviewsRepository.delete).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockReviewsRepository.findById.mockResolvedValue(mockReview);
      mockReviewsRepository.delete.mockRejectedValue(repositoryError);

      await expect(
        reviewsService.deleteReview('user-uuid-123', 'review-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getBookReviews ─────────────────────────────────────────────

  describe('getBookReviews', () => {
    it('devrait retourner les reviews d\'un livre', async () => {
      mockReviewsRepository.findByBookId.mockResolvedValue([mockReviewWithBook]);

      const result = await reviewsService.getBookReviews('book-uuid-123', 1, 10);

      expect(result).toHaveLength(1);
      expect(result[0]?.book).toBeDefined();
      expect(mockReviewsRepository.findByBookId).toHaveBeenCalledWith(
        'book-uuid-123',
        1,
        10,
      );
      expect(mockReviewsRepository.findByBookId).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si aucune review pour ce livre', async () => {
      mockReviewsRepository.findByBookId.mockResolvedValue([]);

      const result = await reviewsService.getBookReviews('book-uuid-123', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockReviewsRepository.findByBookId.mockRejectedValue(repositoryError);

      await expect(
        reviewsService.getBookReviews('book-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getUserReviews ─────────────────────────────────────────────

  describe('getUserReviews', () => {
    it('devrait retourner les reviews d\'un utilisateur', async () => {
      mockReviewsRepository.findByUserId.mockResolvedValue([mockReviewWithBook]);

      const result = await reviewsService.getUserReviews('user-uuid-123', 1, 10);

      expect(result).toHaveLength(1);
      expect(result[0]?.book).toBeDefined();
      expect(mockReviewsRepository.findByUserId).toHaveBeenCalledWith(
        'user-uuid-123',
        1,
        10,
      );
      expect(mockReviewsRepository.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si l\'utilisateur n\'a pas de reviews', async () => {
      mockReviewsRepository.findByUserId.mockResolvedValue([]);

      const result = await reviewsService.getUserReviews('user-uuid-123', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockReviewsRepository.findByUserId.mockRejectedValue(repositoryError);

      await expect(
        reviewsService.getUserReviews('user-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
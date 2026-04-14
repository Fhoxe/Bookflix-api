import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsRepository, ReviewWithBook } from './reviews.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
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

const mockReviewWithBook: ReviewWithBook = {
  ...mockReview,
  book: mockBook,
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

const mockPrismaService = {
  review: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const prismaError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('ReviewsRepository', () => {
  let reviewsRepository: ReviewsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    reviewsRepository = module.get<ReviewsRepository>(ReviewsRepository);
    jest.clearAllMocks();
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('devrait retourner une review par son id', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      const result = await reviewsRepository.findById('review-uuid-123');

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: { id: 'review-uuid-123' },
      });
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si la review est introuvable', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      const result = await reviewsRepository.findById('review-uuid-inexistant');

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.findUnique.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.findById('review-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByBookId ───────────────────────────────────────────────

  describe('findByBookId', () => {
    it('devrait retourner les reviews paginées d\'un livre', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([mockReviewWithBook]);

      const result = await reviewsRepository.findByBookId('book-uuid-123', 1, 10);

      expect(result).toEqual([mockReviewWithBook]);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { bookId: 'book-uuid-123' },
        include: { book: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.review.findMany).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si aucune review pour ce livre', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await reviewsRepository.findByBookId('book-uuid-123', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait calculer le bon offset pour la page 2', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      await reviewsRepository.findByBookId('book-uuid-123', 2, 10);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.findMany.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.findByBookId('book-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByUserId ───────────────────────────────────────────────

  describe('findByUserId', () => {
    it('devrait retourner les reviews paginées d\'un utilisateur', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([mockReviewWithBook]);

      const result = await reviewsRepository.findByUserId('user-uuid-123', 1, 10);

      expect(result).toEqual([mockReviewWithBook]);
      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123' },
        include: { book: true },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(mockPrismaService.review.findMany).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si l\'utilisateur n\'a pas de reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await reviewsRepository.findByUserId('user-uuid-123', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait calculer le bon offset pour la page 2', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      await reviewsRepository.findByUserId('user-uuid-123', 2, 10);

      expect(mockPrismaService.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.findMany.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.findByUserId('user-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByUserIdAndBookId ──────────────────────────────────────

  describe('findByUserIdAndBookId', () => {
    it('devrait retourner une review par userId et bookId', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      const result = await reviewsRepository.findByUserIdAndBookId(
        'user-uuid-123',
        'book-uuid-123',
      );

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledWith({
        where: {
          userId_bookId: { userId: 'user-uuid-123', bookId: 'book-uuid-123' },
        },
      });
      expect(mockPrismaService.review.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si la review est introuvable', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      const result = await reviewsRepository.findByUserIdAndBookId(
        'user-uuid-123',
        'book-uuid-inexistant',
      );

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.findUnique.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.findByUserIdAndBookId('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countByBookId ──────────────────────────────────────────────

  describe('countByBookId', () => {
    it('devrait retourner le nombre de reviews pour un livre', async () => {
      mockPrismaService.review.count.mockResolvedValue(5);

      const result = await reviewsRepository.countByBookId('book-uuid-123');

      expect(result).toBe(5);
      expect(mockPrismaService.review.count).toHaveBeenCalledWith({
        where: { bookId: 'book-uuid-123' },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 0 si aucune review pour ce livre', async () => {
      mockPrismaService.review.count.mockResolvedValue(0);

      const result = await reviewsRepository.countByBookId('book-uuid-123');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.count.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.countByBookId('book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countByUserId ──────────────────────────────────────────────

  describe('countByUserId', () => {
    it('devrait retourner le nombre de reviews d\'un utilisateur', async () => {
      mockPrismaService.review.count.mockResolvedValue(3);

      const result = await reviewsRepository.countByUserId('user-uuid-123');

      expect(result).toBe(3);
      expect(mockPrismaService.review.count).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123' },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 0 si l\'utilisateur n\'a pas de reviews', async () => {
      mockPrismaService.review.count.mockResolvedValue(0);

      const result = await reviewsRepository.countByUserId('user-uuid-123');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.count.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.countByUserId('user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer une review et la retourner', async () => {
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      const result = await reviewsRepository.create(
        'user-uuid-123',
        mockCreateReviewInput,
      );

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-123',
          bookId: mockCreateReviewInput.bookId,
          rating: mockCreateReviewInput.rating,
          comment: mockCreateReviewInput.comment,
        },
      });
      expect(mockPrismaService.review.create).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.create.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.create('user-uuid-123', mockCreateReviewInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait mettre à jour une review et la retourner', async () => {
      const updatedReview = { ...mockReview, rating: 4, comment: 'Très bon livre !' };
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      const result = await reviewsRepository.update(
        'review-uuid-123',
        mockUpdateReviewInput,
      );

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Très bon livre !');
      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'review-uuid-123' },
        data: {
          rating: mockUpdateReviewInput.rating,
          comment: mockUpdateReviewInput.comment,
        },
      });
      expect(mockPrismaService.review.update).toHaveBeenCalledTimes(1);
    });

    it('devrait mettre à jour uniquement la note si seule la note est fournie', async () => {
      const updatedReview = { ...mockReview, rating: 3 };
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      await reviewsRepository.update('review-uuid-123', { rating: 3 });

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'review-uuid-123' },
        data: { rating: 3 },
      });
    });

    it('devrait mettre à jour uniquement le commentaire si seul le commentaire est fourni', async () => {
      const updatedReview = { ...mockReview, comment: 'Nouveau commentaire' };
      mockPrismaService.review.update.mockResolvedValue(updatedReview);

      await reviewsRepository.update('review-uuid-123', {
        comment: 'Nouveau commentaire',
      });

      expect(mockPrismaService.review.update).toHaveBeenCalledWith({
        where: { id: 'review-uuid-123' },
        data: { comment: 'Nouveau commentaire' },
      });
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.update.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.update('review-uuid-123', mockUpdateReviewInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── delete ─────────────────────────────────────────────────────

  describe('delete', () => {
    it('devrait supprimer une review et la retourner', async () => {
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      const result = await reviewsRepository.delete('review-uuid-123');

      expect(result).toEqual(mockReview);
      expect(mockPrismaService.review.delete).toHaveBeenCalledWith({
        where: { id: 'review-uuid-123' },
      });
      expect(mockPrismaService.review.delete).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review.delete.mockRejectedValue(prismaError);

      await expect(
        reviewsRepository.delete('review-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
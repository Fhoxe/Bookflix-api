import { Test, TestingModule } from '@nestjs/testing';
import { BooksRepository } from './books.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MappedBook } from './google-books.service.js';
import { CreateBookInput } from './dto/create-book.input.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockBook = {
  id: 'uuid-123',
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

const mockMappedBook: MappedBook = {
  googleBooksId: 'google-123',
  title: 'Clean Code',
  authors: 'Robert C. Martin',
  description: 'Un livre sur le code propre',
  publishedYear: 2008,
  genre: 'Informatique',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '9780132350884',
};

const mockCreateBookInput: CreateBookInput = {
  title: 'Clean Code',
  authors: 'Robert C. Martin',
  description: 'Un livre sur le code propre',
  publishedYear: 2008,
  genre: 'Informatique',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '9780132350884',
};

const mockPrismaService = {
  book: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    create: jest.fn(),
  },
};

const prismaError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('BooksRepository', () => {
  let booksRepository: BooksRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    booksRepository = module.get<BooksRepository>(BooksRepository);
    jest.clearAllMocks();
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('devrait retourner un livre par son id', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(mockBook);

      const result = await booksRepository.findById('uuid-123');

      expect(result).toEqual(mockBook);
      expect(mockPrismaService.book.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('devrait retourner null si le livre est introuvable', async () => {
      mockPrismaService.book.findUnique.mockResolvedValue(null);

      const result = await booksRepository.findById('uuid-inexistant');

      expect(result).toBeNull();
      expect(mockPrismaService.book.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.findUnique.mockRejectedValue(prismaError);

      await expect(booksRepository.findById('uuid-123')).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── findAll ────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait retourner une liste paginée de livres', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      const result = await booksRepository.findAll(1, 10);

      expect(result).toEqual([mockBook]);
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('devrait retourner un tableau vide si aucun livre en base', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([]);

      const result = await booksRepository.findAll(1, 10);

      expect(result).toEqual([]);
    });

    it('devrait calculer le bon offset pour la page 2', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([]);

      await booksRepository.findAll(2, 10);

      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.findMany.mockRejectedValue(prismaError);

      await expect(booksRepository.findAll(1, 10)).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── findByGenre ────────────────────────────────────────────────

  describe('findByGenre', () => {
    it('devrait retourner les livres du genre demandé', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      const result = await booksRepository.findByGenre('Informatique', 1, 10);

      expect(result).toEqual([mockBook]);
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith({
        where: {
          genre: { contains: 'Informatique', mode: 'insensitive' },
        },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('devrait retourner un tableau vide si aucun livre trouvé pour ce genre', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([]);

      const result = await booksRepository.findByGenre('GenreInexistant', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.findMany.mockRejectedValue(prismaError);

      await expect(
        booksRepository.findByGenre('Informatique', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countAll ───────────────────────────────────────────────────

  describe('countAll', () => {
    it('devrait retourner le nombre total de livres', async () => {
      mockPrismaService.book.count.mockResolvedValue(42);

      const result = await booksRepository.countAll();

      expect(result).toBe(42);
      expect(mockPrismaService.book.count).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 0 si aucun livre en base', async () => {
      mockPrismaService.book.count.mockResolvedValue(0);

      const result = await booksRepository.countAll();

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.count.mockRejectedValue(prismaError);

      await expect(booksRepository.countAll()).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── countByGenre ───────────────────────────────────────────────

  describe('countByGenre', () => {
    it('devrait retourner le nombre de livres pour un genre donné', async () => {
      mockPrismaService.book.count.mockResolvedValue(15);

      const result = await booksRepository.countByGenre('Informatique');

      expect(result).toBe(15);
      expect(mockPrismaService.book.count).toHaveBeenCalledWith({
        where: {
          genre: { contains: 'Informatique', mode: 'insensitive' },
        },
      });
    });

    it('devrait retourner 0 si aucun livre trouvé pour ce genre', async () => {
      mockPrismaService.book.count.mockResolvedValue(0);

      const result = await booksRepository.countByGenre('GenreInexistant');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.count.mockRejectedValue(prismaError);

      await expect(
        booksRepository.countByGenre('Informatique'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── upsertFromGoogle ───────────────────────────────────────────

  describe('upsertFromGoogle', () => {
    it('devrait créer ou mettre à jour un livre depuis Google Books', async () => {
      mockPrismaService.book.upsert.mockResolvedValue(mockBook);

      const result = await booksRepository.upsertFromGoogle(mockMappedBook);

      expect(result).toEqual(mockBook);
      expect(mockPrismaService.book.upsert).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.upsert.mockRejectedValue(prismaError);

      await expect(
        booksRepository.upsertFromGoogle(mockMappedBook),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── create ─────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer un livre manuellement', async () => {
      mockPrismaService.book.create.mockResolvedValue(mockBook);

      const result = await booksRepository.create(mockCreateBookInput);

      expect(result).toEqual(mockBook);
      expect(mockPrismaService.book.create).toHaveBeenCalledWith({
        data: mockCreateBookInput,
      });
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.create.mockRejectedValue(prismaError);

      await expect(
        booksRepository.create(mockCreateBookInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });
  
  // ─── getAverageRating ───────────────────────────────────────────

  describe('getAverageRating', () => {
    it('devrait retourner la moyenne des notes arrondie à 1 décimale', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.35 },
          _count: { rating: 2 },
        }),
        count: jest.fn(),
      };

      const result = await booksRepository.getAverageRating('book-uuid-123');

      expect(result).toBe(4.4);
    });

    it('devrait retourner null si aucune review', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: null },
          _count: { rating: 0 },
        }),
        count: jest.fn(),
      };

      const result = await booksRepository.getAverageRating('book-uuid-123');

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn().mockRejectedValue(prismaError),
        count: jest.fn(),
      };

      await expect(
        booksRepository.getAverageRating('book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getReviewCount ─────────────────────────────────────────────

  describe('getReviewCount', () => {
    it('devrait retourner le nombre de reviews d\'un livre', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn(),
        count: jest.fn().mockResolvedValue(5),
      };

      const result = await booksRepository.getReviewCount('book-uuid-123');

      expect(result).toBe(5);
      expect(mockPrismaService.review.count).toHaveBeenCalledWith({
        where: { bookId: 'book-uuid-123' },
      });
      expect(mockPrismaService.review.count).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 0 si aucune review', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      };

      const result = await booksRepository.getReviewCount('book-uuid-123');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.review = {
        aggregate: jest.fn(),
        count: jest.fn().mockRejectedValue(prismaError),
      };

      await expect(
        booksRepository.getReviewCount('book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── searchLocal ────────────────────────────────────────────────

  describe('searchLocal', () => {
    it('devrait retourner les livres correspondant à la query', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      const result = await booksRepository.searchLocal(
        { query: 'Clean' },
        1,
        10,
      );

      expect(result).toEqual([mockBook]);
      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
          skip: 0,
          take: 10,
        }),
      );
      expect(mockPrismaService.book.findMany).toHaveBeenCalledTimes(1);
    });

    it('devrait filtrer par auteur', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      await booksRepository.searchLocal({ author: 'Martin' }, 1, 10);

      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authors: { contains: 'Martin', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('devrait filtrer par titre', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      await booksRepository.searchLocal({ title: 'Clean' }, 1, 10);

      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'Clean', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('devrait filtrer par plage d\'années', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([mockBook]);

      await booksRepository.searchLocal(
        { yearFrom: 2000, yearTo: 2010 },
        1,
        10,
      );

      expect(mockPrismaService.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            publishedYear: { gte: 2000, lte: 2010 },
          }),
        }),
      );
    });

    it('devrait retourner un tableau vide si aucun résultat', async () => {
      mockPrismaService.book.findMany.mockResolvedValue([]);

      const result = await booksRepository.searchLocal(
        { query: 'xxxxxxxxxxx' },
        1,
        10,
      );

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.findMany.mockRejectedValue(prismaError);

      await expect(
        booksRepository.searchLocal({ query: 'Clean' }, 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countLocal ─────────────────────────────────────────────────

  describe('countLocal', () => {
    it('devrait retourner le nombre de livres correspondant aux filtres', async () => {
      mockPrismaService.book.count.mockResolvedValue(5);

      const result = await booksRepository.countLocal({ query: 'Clean' });

      expect(result).toBe(5);
      expect(mockPrismaService.book.count).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner 0 si aucun résultat', async () => {
      mockPrismaService.book.count.mockResolvedValue(0);

      const result = await booksRepository.countLocal({ query: 'xxxxxxxxxxx' });

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.book.count.mockRejectedValue(prismaError);

      await expect(
        booksRepository.countLocal({ query: 'Clean' }),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});


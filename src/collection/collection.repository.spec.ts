import { Test, TestingModule } from '@nestjs/testing';
import { ReadingStatus } from '@prisma/client';
import { CollectionRepository, UserBookWithBook } from './collection.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

const mockUserBook = {
  id: 'userbook-uuid-123',
  userId: 'user-uuid-123',
  bookId: 'book-uuid-123',
  status: ReadingStatus.TO_READ,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserBookWithBook: UserBookWithBook = {
  ...mockUserBook,
  book: mockBook,
};

const mockPrismaService = {
  userBook: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const prismaError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('CollectionRepository', () => {
  let collectionRepository: CollectionRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    collectionRepository = module.get<CollectionRepository>(CollectionRepository);
    jest.clearAllMocks();
  });

  // ─── findByUserId ───────────────────────────────────────────────

  describe('findByUserId', () => {
    it('devrait retourner la collection paginée d\'un utilisateur', async () => {
      mockPrismaService.userBook.findMany.mockResolvedValue([mockUserBookWithBook]);

      const result = await collectionRepository.findByUserId('user-uuid-123', 1, 10);

      expect(result).toEqual([mockUserBookWithBook]);
      expect(mockPrismaService.userBook.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123' },
        include: { book: true },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
      expect(mockPrismaService.userBook.findMany).toHaveBeenCalledTimes(1);
    });

    it('devrait filtrer par statut si fourni', async () => {
      mockPrismaService.userBook.findMany.mockResolvedValue([mockUserBookWithBook]);

      await collectionRepository.findByUserId(
        'user-uuid-123',
        1,
        10,
        ReadingStatus.TO_READ,
      );

      expect(mockPrismaService.userBook.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123', status: ReadingStatus.TO_READ },
        include: { book: true },
        skip: 0,
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('devrait retourner un tableau vide si la collection est vide', async () => {
      mockPrismaService.userBook.findMany.mockResolvedValue([]);

      const result = await collectionRepository.findByUserId('user-uuid-123', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait calculer le bon offset pour la page 2', async () => {
      mockPrismaService.userBook.findMany.mockResolvedValue([]);

      await collectionRepository.findByUserId('user-uuid-123', 2, 10);

      expect(mockPrismaService.userBook.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.findMany.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.findByUserId('user-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByUserIdAndBookId ──────────────────────────────────────

  describe('findByUserIdAndBookId', () => {
    it('devrait retourner une entrée de collection par userId et bookId', async () => {
      mockPrismaService.userBook.findUnique.mockResolvedValue(mockUserBook);

      const result = await collectionRepository.findByUserIdAndBookId(
        'user-uuid-123',
        'book-uuid-123',
      );

      expect(result).toEqual(mockUserBook);
      expect(mockPrismaService.userBook.findUnique).toHaveBeenCalledWith({
        where: { userId_bookId: { userId: 'user-uuid-123', bookId: 'book-uuid-123' } },
      });
      expect(mockPrismaService.userBook.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si l\'entrée est introuvable', async () => {
      mockPrismaService.userBook.findUnique.mockResolvedValue(null);

      const result = await collectionRepository.findByUserIdAndBookId(
        'user-uuid-123',
        'book-uuid-inexistant',
      );

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.findUnique.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.findByUserIdAndBookId('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countByUserId ──────────────────────────────────────────────

  describe('countByUserId', () => {
    it('devrait retourner le nombre total d\'entrées dans la collection', async () => {
      mockPrismaService.userBook.count.mockResolvedValue(5);

      const result = await collectionRepository.countByUserId('user-uuid-123');

      expect(result).toBe(5);
      expect(mockPrismaService.userBook.count).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123' },
      });
      expect(mockPrismaService.userBook.count).toHaveBeenCalledTimes(1);
    });

    it('devrait filtrer par statut si fourni', async () => {
      mockPrismaService.userBook.count.mockResolvedValue(3);

      await collectionRepository.countByUserId('user-uuid-123', ReadingStatus.READ);

      expect(mockPrismaService.userBook.count).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-123', status: ReadingStatus.READ },
      });
    });

    it('devrait retourner 0 si la collection est vide', async () => {
      mockPrismaService.userBook.count.mockResolvedValue(0);

      const result = await collectionRepository.countByUserId('user-uuid-123');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.count.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.countByUserId('user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── add ────────────────────────────────────────────────────────

  describe('add', () => {
    it('devrait ajouter un livre à la collection', async () => {
      mockPrismaService.userBook.create.mockResolvedValue(mockUserBook);

      const result = await collectionRepository.add(
        'user-uuid-123',
        'book-uuid-123',
        ReadingStatus.TO_READ,
      );

      expect(result).toEqual(mockUserBook);
      expect(mockPrismaService.userBook.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-uuid-123',
          bookId: 'book-uuid-123',
          status: ReadingStatus.TO_READ,
        },
      });
      expect(mockPrismaService.userBook.create).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.create.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.add('user-uuid-123', 'book-uuid-123', ReadingStatus.TO_READ),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── updateStatus ───────────────────────────────────────────────

  describe('updateStatus', () => {
    it('devrait mettre à jour le statut d\'une entrée', async () => {
      const updatedUserBook = { ...mockUserBook, status: ReadingStatus.READ };
      mockPrismaService.userBook.update.mockResolvedValue(updatedUserBook);

      const result = await collectionRepository.updateStatus(
        'user-uuid-123',
        'book-uuid-123',
        ReadingStatus.READ,
      );

      expect(result.status).toBe(ReadingStatus.READ);
      expect(mockPrismaService.userBook.update).toHaveBeenCalledWith({
        where: { userId_bookId: { userId: 'user-uuid-123', bookId: 'book-uuid-123' } },
        data: { status: ReadingStatus.READ },
      });
      expect(mockPrismaService.userBook.update).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.update.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.updateStatus(
          'user-uuid-123',
          'book-uuid-123',
          ReadingStatus.READ,
        ),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── remove ─────────────────────────────────────────────────────

  describe('remove', () => {
    it('devrait supprimer une entrée de la collection', async () => {
      mockPrismaService.userBook.delete.mockResolvedValue(mockUserBook);

      const result = await collectionRepository.remove(
        'user-uuid-123',
        'book-uuid-123',
      );

      expect(result).toEqual(mockUserBook);
      expect(mockPrismaService.userBook.delete).toHaveBeenCalledWith({
        where: { userId_bookId: { userId: 'user-uuid-123', bookId: 'book-uuid-123' } },
      });
      expect(mockPrismaService.userBook.delete).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.userBook.delete.mockRejectedValue(prismaError);

      await expect(
        collectionRepository.remove('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
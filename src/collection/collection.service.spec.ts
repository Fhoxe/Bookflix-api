import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ReadingStatus } from '@prisma/client';
import { CollectionService } from './collection.service.js';
import { CollectionRepository } from './collection.repository.js';
import { BooksService } from '../books/books.service.js';
import { AddToCollectionInput } from './dto/add-to-collection.input.js';
import { UpdateCollectionStatusInput } from './dto/update-collection-status.input.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockBookType = {
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

const mockUserBookWithBook = {
  ...mockUserBook,
  book: {
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
  },
};

const mockUserBookType = {
  id: 'userbook-uuid-123',
  userId: 'user-uuid-123',
  bookId: 'book-uuid-123',
  status: ReadingStatus.TO_READ,
  createdAt: mockUserBook.createdAt,
  updatedAt: mockUserBook.updatedAt,
  book: undefined,
};

const mockAddToCollectionInput: AddToCollectionInput = {
  bookId: 'book-uuid-123',
  status: ReadingStatus.TO_READ,
};

const mockUpdateCollectionStatusInput: UpdateCollectionStatusInput = {
  bookId: 'book-uuid-123',
  status: ReadingStatus.READ,
};

const mockCollectionRepository = {
  findByUserId: jest.fn(),
  findByUserIdAndBookId: jest.fn(),
  countByUserId: jest.fn(),
  add: jest.fn(),
  updateStatus: jest.fn(),
  remove: jest.fn(),
};

const mockBooksService = {
  findById: jest.fn(),
};

const repositoryError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('CollectionService', () => {
  let collectionService: CollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionService,
        { provide: CollectionRepository, useValue: mockCollectionRepository },
        { provide: BooksService, useValue: mockBooksService },
      ],
    }).compile();

    collectionService = module.get<CollectionService>(CollectionService);
    jest.clearAllMocks();
  });

  // ─── addToCollection ────────────────────────────────────────────

  describe('addToCollection', () => {
    it('devrait ajouter un livre à la collection et retourner un UserBookType', async () => {
      mockBooksService.findById.mockResolvedValue(mockBookType);
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);
      mockCollectionRepository.add.mockResolvedValue(mockUserBook);

      const result = await collectionService.addToCollection(
        'user-uuid-123',
        mockAddToCollectionInput,
      );

      expect(result).toEqual(mockUserBookType);
      expect(mockBooksService.findById).toHaveBeenCalledWith('book-uuid-123');
      expect(mockCollectionRepository.add).toHaveBeenCalledWith(
        'user-uuid-123',
        'book-uuid-123',
        ReadingStatus.TO_READ,
      );
      expect(mockCollectionRepository.add).toHaveBeenCalledTimes(1);
    });

    it('devrait utiliser TO_READ par défaut si status non fourni', async () => {
      mockBooksService.findById.mockResolvedValue(mockBookType);
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);
      mockCollectionRepository.add.mockResolvedValue(mockUserBook);

      await collectionService.addToCollection('user-uuid-123', {
        bookId: 'book-uuid-123',
      });

      expect(mockCollectionRepository.add).toHaveBeenCalledWith(
        'user-uuid-123',
        'book-uuid-123',
        ReadingStatus.TO_READ,
      );
    });

    it('devrait lever une NotFoundException si le livre est introuvable', async () => {
      mockBooksService.findById.mockRejectedValue(
        new NotFoundException('Livre introuvable'),
      );

      await expect(
        collectionService.addToCollection('user-uuid-123', mockAddToCollectionInput),
      ).rejects.toThrow(NotFoundException);

      expect(mockCollectionRepository.add).not.toHaveBeenCalled();
    });

    it('devrait lever une ConflictException si le livre est déjà dans la collection', async () => {
      mockBooksService.findById.mockResolvedValue(mockBookType);
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);

      await expect(
        collectionService.addToCollection('user-uuid-123', mockAddToCollectionInput),
      ).rejects.toThrow(ConflictException);

      expect(mockCollectionRepository.add).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksService.findById.mockResolvedValue(mockBookType);
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);
      mockCollectionRepository.add.mockRejectedValue(repositoryError);

      await expect(
        collectionService.addToCollection('user-uuid-123', mockAddToCollectionInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── updateStatus ───────────────────────────────────────────────

  describe('updateStatus', () => {
    it('devrait mettre à jour le statut et retourner un UserBookType', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);
      mockCollectionRepository.updateStatus.mockResolvedValue({
        ...mockUserBook,
        status: ReadingStatus.READ,
      });

      const result = await collectionService.updateStatus(
        'user-uuid-123',
        mockUpdateCollectionStatusInput,
      );

      expect(result.status).toBe(ReadingStatus.READ);
      expect(mockCollectionRepository.updateStatus).toHaveBeenCalledWith(
        'user-uuid-123',
        'book-uuid-123',
        ReadingStatus.READ,
      );
      expect(mockCollectionRepository.updateStatus).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si le livre n\'est pas dans la collection', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);

      await expect(
        collectionService.updateStatus('user-uuid-123', mockUpdateCollectionStatusInput),
      ).rejects.toThrow(NotFoundException);

      expect(mockCollectionRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);
      mockCollectionRepository.updateStatus.mockRejectedValue(repositoryError);

      await expect(
        collectionService.updateStatus('user-uuid-123', mockUpdateCollectionStatusInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── removeFromCollection ───────────────────────────────────────

  describe('removeFromCollection', () => {
    it('devrait supprimer un livre de la collection et retourner un UserBookType', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);
      mockCollectionRepository.remove.mockResolvedValue(mockUserBook);

      const result = await collectionService.removeFromCollection(
        'user-uuid-123',
        'book-uuid-123',
      );

      expect(result).toEqual(mockUserBookType);
      expect(mockCollectionRepository.remove).toHaveBeenCalledWith(
        'user-uuid-123',
        'book-uuid-123',
      );
      expect(mockCollectionRepository.remove).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si le livre n\'est pas dans la collection', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);

      await expect(
        collectionService.removeFromCollection('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow(NotFoundException);

      expect(mockCollectionRepository.remove).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);
      mockCollectionRepository.remove.mockRejectedValue(repositoryError);

      await expect(
        collectionService.removeFromCollection('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getMyCollection ────────────────────────────────────────────

  describe('getMyCollection', () => {
    it('devrait retourner un PaginatedUserBooksType', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([mockUserBookWithBook]);
      mockCollectionRepository.countByUserId.mockResolvedValue(1);

      const result = await collectionService.getMyCollection(
        'user-uuid-123',
        1,
        10,
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNextPage).toBe(false);
      expect(result.hasPreviousPage).toBe(false);
      expect(result.items[0]?.book).toBeDefined();
    });

    it('devrait filtrer par statut si fourni', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([]);
      mockCollectionRepository.countByUserId.mockResolvedValue(0);

      await collectionService.getMyCollection(
        'user-uuid-123',
        1,
        10,
        ReadingStatus.READ,
      );

      expect(mockCollectionRepository.findByUserId).toHaveBeenCalledWith(
        'user-uuid-123',
        1,
        10,
        ReadingStatus.READ,
      );
    });

    it('devrait retourner items vide si la collection est vide', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([]);
      mockCollectionRepository.countByUserId.mockResolvedValue(0);

      const result = await collectionService.getMyCollection(
        'user-uuid-123',
        1,
        10,
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionRepository.findByUserId.mockRejectedValue(repositoryError);
      mockCollectionRepository.countByUserId.mockResolvedValue(0);

      await expect(
        collectionService.getMyCollection('user-uuid-123', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getUserCollection ──────────────────────────────────────────

  describe('getUserCollection', () => {
    it('devrait retourner un PaginatedUserBooksType si profil public', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([mockUserBookWithBook]);
      mockCollectionRepository.countByUserId.mockResolvedValue(1);

      const result = await collectionService.getUserCollection(
        'requester-uuid',
        'user-uuid-123',
        1,
        10,
        undefined,
        true,
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('devrait retourner la collection si le requester est le propriétaire', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([mockUserBookWithBook]);
      mockCollectionRepository.countByUserId.mockResolvedValue(1);

      const result = await collectionService.getUserCollection(
        'user-uuid-123',
        'user-uuid-123',
        1,
        10,
        undefined,
        false,
      );

      expect(result.items).toHaveLength(1);
    });

    it('devrait lever une ForbiddenException si le profil est privé', async () => {
      await expect(
        collectionService.getUserCollection(
          'requester-uuid',
          'user-uuid-123',
          1,
          10,
          undefined,
          false,
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(mockCollectionRepository.findByUserId).not.toHaveBeenCalled();
    });

    it('devrait retourner items vide si collection publique vide', async () => {
      mockCollectionRepository.findByUserId.mockResolvedValue([]);
      mockCollectionRepository.countByUserId.mockResolvedValue(0);

      const result = await collectionService.getUserCollection(
        'requester-uuid',
        'user-uuid-123',
        1,
        10,
        undefined,
        true,
      );

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionRepository.findByUserId.mockRejectedValue(repositoryError);
      mockCollectionRepository.countByUserId.mockResolvedValue(0);

      await expect(
        collectionService.getUserCollection(
          'requester-uuid',
          'user-uuid-123',
          1,
          10,
          undefined,
          true,
        ),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getEntryByBookId ───────────────────────────────────────────

  describe('getEntryByBookId', () => {
    it('devrait retourner une entrée de collection par bookId', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(mockUserBook);

      const result = await collectionService.getEntryByBookId(
        'user-uuid-123',
        'book-uuid-123',
      );

      expect(result).toEqual(mockUserBook);
      expect(mockCollectionRepository.findByUserIdAndBookId).toHaveBeenCalledWith(
        'user-uuid-123',
        'book-uuid-123',
      );
      expect(mockCollectionRepository.findByUserIdAndBookId).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si l\'entrée est introuvable', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockResolvedValue(null);

      const result = await collectionService.getEntryByBookId(
        'user-uuid-123',
        'book-uuid-inexistant',
      );

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockCollectionRepository.findByUserIdAndBookId.mockRejectedValue(repositoryError);

      await expect(
        collectionService.getEntryByBookId('user-uuid-123', 'book-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
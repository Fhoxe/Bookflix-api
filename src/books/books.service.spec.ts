import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { BooksRepository } from './books.repository.js';
import { GoogleBooksService } from './google-books.service.js';
import { CreateBookInput } from './dto/create-book.input.js';
import { BookType } from './dto/book.type.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockPrismaBook = {
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

const mockPrismaBookWithNulls = {
  id: 'uuid-456',
  googleBooksId: null,
  title: 'Livre sans métadonnées',
  authors: 'Auteur inconnu',
  description: null,
  publishedYear: null,
  genre: null,
  coverUrl: null,
  isbn: null,
  lastSyncedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockBookType: BookType = {
  id: 'uuid-123',
  googleBooksId: 'google-123',
  title: 'Clean Code',
  authors: 'Robert C. Martin',
  description: 'Un livre sur le code propre',
  publishedYear: 2008,
  genre: 'Informatique',
  coverUrl: 'https://example.com/cover.jpg',
  isbn: '9780132350884',
  lastSyncedAt: mockPrismaBook.lastSyncedAt,
  createdAt: mockPrismaBook.createdAt,
  updatedAt: mockPrismaBook.updatedAt,
};

const mockMappedBook = {
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

const mockBooksRepository = {
  findById: jest.fn(),
  findAll: jest.fn(),
  findByGenre: jest.fn(),
  countAll: jest.fn(),
  countByGenre: jest.fn(),
  upsertFromGoogle: jest.fn(),
  create: jest.fn(),
};

const mockGoogleBooksService = {
  searchBooks: jest.fn(),
  searchByGenre: jest.fn(),
};

const repositoryError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('BooksService', () => {
  let booksService: BooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: BooksRepository, useValue: mockBooksRepository },
        { provide: GoogleBooksService, useValue: mockGoogleBooksService },
      ],
    }).compile();

    booksService = module.get<BooksService>(BooksService);
    jest.clearAllMocks();
  });

  // ─── searchBooks ────────────────────────────────────────────────

  describe('searchBooks', () => {
    it('devrait rechercher, upsert et retourner des BookType', async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue([mockMappedBook]);
      mockBooksRepository.upsertFromGoogle.mockResolvedValue(mockPrismaBook);

      const result = await booksService.searchBooks({
        query: 'Clean Code',
        maxResults: 10,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockBookType);
      expect(mockGoogleBooksService.searchBooks).toHaveBeenCalledWith(
        'Clean Code',
        10,
        undefined,
      );
      expect(mockBooksRepository.upsertFromGoogle).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner un tableau vide si Google Books ne retourne rien', async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue([]);

      const result = await booksService.searchBooks({
        query: 'xxxxxxxxxxx',
        maxResults: 10,
      });

      expect(result).toEqual([]);
      expect(mockBooksRepository.upsertFromGoogle).not.toHaveBeenCalled();
    });

    it('devrait utiliser maxResults par défaut si non fourni', async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue([]);

      await booksService.searchBooks({ query: 'Clean Code' });

      expect(mockGoogleBooksService.searchBooks).toHaveBeenCalledWith(
        'Clean Code',
        10,
        undefined,
      );
    });

    it('devrait convertir les null Prisma en undefined dans le BookType', async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue([mockMappedBook]);
      mockBooksRepository.upsertFromGoogle.mockResolvedValue(
        mockPrismaBookWithNulls,
      );

      const result = await booksService.searchBooks({
        query: 'Livre',
        maxResults: 10,
      });

      expect(result[0]?.googleBooksId).toBeUndefined();
      expect(result[0]?.description).toBeUndefined();
      expect(result[0]?.publishedYear).toBeUndefined();
      expect(result[0]?.genre).toBeUndefined();
      expect(result[0]?.coverUrl).toBeUndefined();
      expect(result[0]?.isbn).toBeUndefined();
    });

    it("devrait lever une erreur si l'upsert échoue", async () => {
      mockGoogleBooksService.searchBooks.mockResolvedValue([mockMappedBook]);
      mockBooksRepository.upsertFromGoogle.mockRejectedValue(repositoryError);

      await expect(
        booksService.searchBooks({ query: 'Clean Code', maxResults: 10 }),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findAll ────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait retourner une liste paginée de BookType', async () => {
      mockBooksRepository.findAll.mockResolvedValue([mockPrismaBook]);

      const result = await booksService.findAll(1, 10);

      expect(result).toEqual([mockBookType]);
      expect(mockBooksRepository.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('devrait retourner un tableau vide si aucun livre en base', async () => {
      mockBooksRepository.findAll.mockResolvedValue([]);

      const result = await booksService.findAll(1, 10);

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.findAll.mockRejectedValue(repositoryError);

      await expect(booksService.findAll(1, 10)).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('devrait retourner un BookType par son id', async () => {
      mockBooksRepository.findById.mockResolvedValue(mockPrismaBook);

      const result = await booksService.findById('uuid-123');

      expect(result).toEqual(mockBookType);
      expect(mockBooksRepository.findById).toHaveBeenCalledWith('uuid-123');
    });

    it('devrait lever une NotFoundException si le livre est introuvable', async () => {
      mockBooksRepository.findById.mockResolvedValue(null);

      await expect(booksService.findById('uuid-inexistant')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.findById.mockRejectedValue(repositoryError);

      await expect(booksService.findById('uuid-123')).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── findByGenre ────────────────────────────────────────────────

  describe('findByGenre', () => {
    it('devrait retourner les BookType du genre demandé', async () => {
      mockBooksRepository.findByGenre.mockResolvedValue([mockPrismaBook]);

      const result = await booksService.findByGenre('Informatique', 1, 10);

      expect(result).toEqual([mockBookType]);
      expect(mockBooksRepository.findByGenre).toHaveBeenCalledWith(
        'Informatique',
        1,
        10,
      );
    });

    it('devrait retourner un tableau vide si aucun livre pour ce genre', async () => {
      mockBooksRepository.findByGenre.mockResolvedValue([]);

      const result = await booksService.findByGenre('GenreInexistant', 1, 10);

      expect(result).toEqual([]);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.findByGenre.mockRejectedValue(repositoryError);

      await expect(
        booksService.findByGenre('Informatique', 1, 10),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── countAll ───────────────────────────────────────────────────

  describe('countAll', () => {
    it('devrait retourner le nombre total de livres', async () => {
      mockBooksRepository.countAll.mockResolvedValue(42);

      const result = await booksService.countAll();

      expect(result).toBe(42);
    });

    it('devrait retourner 0 si aucun livre en base', async () => {
      mockBooksRepository.countAll.mockResolvedValue(0);

      const result = await booksService.countAll();

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.countAll.mockRejectedValue(repositoryError);

      await expect(booksService.countAll()).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── countByGenre ───────────────────────────────────────────────

  describe('countByGenre', () => {
    it('devrait retourner le nombre de livres pour un genre donné', async () => {
      mockBooksRepository.countByGenre.mockResolvedValue(15);

      const result = await booksService.countByGenre('Informatique');

      expect(result).toBe(15);
    });

    it('devrait retourner 0 si aucun livre pour ce genre', async () => {
      mockBooksRepository.countByGenre.mockResolvedValue(0);

      const result = await booksService.countByGenre('GenreInexistant');

      expect(result).toBe(0);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.countByGenre.mockRejectedValue(repositoryError);

      await expect(booksService.countByGenre('Informatique')).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── createBook ─────────────────────────────────────────────────

  describe('createBook', () => {
    it('devrait créer un livre et retourner un BookType', async () => {
      mockBooksRepository.create.mockResolvedValue(mockPrismaBook);

      const result = await booksService.createBook(mockCreateBookInput);

      expect(result).toEqual(mockBookType);
      expect(mockBooksRepository.create).toHaveBeenCalledWith(
        mockCreateBookInput,
      );
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockBooksRepository.create.mockRejectedValue(repositoryError);

      await expect(
        booksService.createBook(mockCreateBookInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
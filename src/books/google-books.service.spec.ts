import { Test, TestingModule } from '@nestjs/testing';
import { GoogleBooksService, GoogleBooksResponse } from './google-books.service.js';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

// ─── Mocks ────────────────────────────────────────────────────────

const mockGoogleBooksResponse: GoogleBooksResponse = {
  totalItems: 1,
  items: [
    {
      id: 'google-123',
      volumeInfo: {
        title: 'Clean Code',
        authors: ['Robert C. Martin'],
        description: 'Un livre sur le code propre',
        publishedDate: '2008-08-01',
        categories: ['Informatique'],
        imageLinks: {
          thumbnail: 'https://example.com/cover.jpg',
        },
        industryIdentifiers: [
          { type: 'ISBN_13', identifier: '9780132350884' },
        ],
      },
    },
  ],
};

const mockEmptyResponse: GoogleBooksResponse = {
  totalItems: 0,
  items: [],
};

const mockResponseWithMissingFields: GoogleBooksResponse = {
  totalItems: 1,
  items: [
    {
      id: 'google-456',
      volumeInfo: {
        title: 'Livre sans auteur',
      },
    },
  ],
};

const mockHttpService = {
  get: jest.fn(),
};

const mockConfigService = {
  getOrThrow: jest.fn().mockImplementation((key: string) => {
    const config: Record<string, string> = {
      GOOGLE_BOOKS_API_URL: 'https://www.googleapis.com/books/v1',
      GOOGLE_BOOKS_API_KEY: 'mock_api_key',
    };
    return config[key];
  }),
};

const httpError = new Error('Erreur réseau');

// ─── Helper ───────────────────────────────────────────────────────

const mockAxiosResponse = (data: GoogleBooksResponse): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as any,
});

// ─── Tests ────────────────────────────────────────────────────────

describe('GoogleBooksService', () => {
  let googleBooksService: GoogleBooksService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleBooksService,
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    googleBooksService = module.get<GoogleBooksService>(GoogleBooksService);
    jest.clearAllMocks();
  });

  // ─── searchBooks ────────────────────────────────────────────────

  describe('searchBooks', () => {
    it('devrait retourner une liste de livres mappés', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockGoogleBooksResponse)),
      );

      const result = await googleBooksService.searchBooks('Clean Code', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        googleBooksId: 'google-123',
        title: 'Clean Code',
        authors: 'Robert C. Martin',
        description: 'Un livre sur le code propre',
        publishedYear: 2008,
        genre: 'Informatique',
        coverUrl: 'https://example.com/cover.jpg',
        isbn: '9780132350884',
      });
    });

    it('devrait retourner un tableau vide si aucun résultat', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockEmptyResponse)),
      );

      const result = await googleBooksService.searchBooks('xxxxxxxxxxx', 10);

      expect(result).toEqual([]);
    });

    it('devrait gérer les champs manquants avec des valeurs par défaut', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockResponseWithMissingFields)),
      );

      const result = await googleBooksService.searchBooks('Livre', 10);

      expect(result[0]?.authors).toBe('Auteur inconnu');
      expect(result[0]?.genre).toBeUndefined();
      expect(result[0]?.isbn).toBeUndefined();
      expect(result[0]?.publishedYear).toBeUndefined();
      expect(result[0]?.coverUrl).toBeUndefined();
    });

    it('devrait inclure le genre dans la query si fourni', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockGoogleBooksResponse)),
      );

      await googleBooksService.searchBooks('Clean Code', 10, 'Informatique');

      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'Clean Code+subject:Informatique',
          }),
        }),
      );
    });

    it('devrait retourner un tableau vide si l\'API échoue', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      const result = await googleBooksService.searchBooks('Clean Code', 10);

      expect(result).toEqual([]);
    });
  });

  // ─── searchByGenre ──────────────────────────────────────────────

  describe('searchByGenre', () => {
    it('devrait rechercher des livres par genre avec maxResults 40', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockGoogleBooksResponse)),
      );

      const result = await googleBooksService.searchByGenre('Informatique');

      expect(result).toHaveLength(1);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            maxResults: 40,
            q: 'subject+subject:Informatique',
          }),
        }),
      );
    });

    it('devrait retourner un tableau vide si aucun résultat pour ce genre', async () => {
      mockHttpService.get.mockReturnValue(
        of(mockAxiosResponse(mockEmptyResponse)),
      );

      const result = await googleBooksService.searchByGenre('GenreInexistant');

      expect(result).toEqual([]);
    });

    it('devrait retourner un tableau vide si l\'API échoue', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => httpError));

      const result = await googleBooksService.searchByGenre('Informatique');

      expect(result).toEqual([]);
    });
  });
});
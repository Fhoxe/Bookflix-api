import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper.js';
import { cleanDatabase, getTestPrisma } from './helpers/db.helper.js';
import { registerAndLogin, authHeader, TestUser } from './helpers/auth.helper.js';

// ─── Tests ────────────────────────────────────────────────────────

describe('Books (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase();
    user = await registerAndLogin(app, 'test@bookflix.com', 'testuser');
  });

  // ─── createBook ─────────────────────────────────────────────────

  describe('createBook', () => {
    it('devrait créer un livre manuellement', async () => {
      const mutation = `
        mutation {
          createBook(input: {
            title: "Clean Code"
            authors: "Robert C. Martin"
            genre: "Technologie"
            publishedYear: 2008
          }) {
            id
            title
            authors
            genre
            publishedYear
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.createBook.title).toBe('Clean Code');
      expect(response.body.data.createBook.authors).toBe('Robert C. Martin');
      expect(response.body.data.createBook.genre).toBe('Technologie');
    });

    it('devrait lever une erreur si le titre est vide', async () => {
      const mutation = `
        mutation {
          createBook(input: {
            title: ""
            authors: "Robert C. Martin"
          }) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser la création sans token', async () => {
      const mutation = `
        mutation {
          createBook(input: {
            title: "Clean Code"
            authors: "Robert C. Martin"
          }) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── books ──────────────────────────────────────────────────────

  describe('books', () => {
    beforeEach(async () => {
      const prisma = getTestPrisma();
      await prisma.book.createMany({
        data: [
          {
            title: 'Clean Code',
            authors: 'Robert C. Martin',
            genre: 'Technologie',
          },
          {
            title: 'The Pragmatic Programmer',
            authors: 'David Thomas',
            genre: 'Technologie',
          },
          {
            title: 'Dune',
            authors: 'Frank Herbert',
            genre: 'Fiction',
          },
        ],
      });
    });

    it('devrait retourner une liste paginée de livres', async () => {
      const query = `
        query {
          books(page: 1, limit: 10) {
            id
            title
            authors
            genre
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.books).toHaveLength(3);
    });

    it('devrait paginer correctement', async () => {
      const query = `
        query {
          books(page: 1, limit: 2) {
            id
            title
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.books).toHaveLength(2);
    });

    it('devrait retourner un tableau vide si aucun livre en base', async () => {
      await getTestPrisma().book.deleteMany();

      const query = `
        query {
          books(page: 1, limit: 10) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.books).toHaveLength(0);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          books(page: 1, limit: 10) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── book ────────────────────────────────────────────────────────

  describe('book', () => {
    let bookId: string;

    beforeEach(async () => {
      const prisma = getTestPrisma();
      const book = await prisma.book.create({
        data: {
          title: 'Clean Code',
          authors: 'Robert C. Martin',
          genre: 'Technologie',
        },
      });
      bookId = book.id;
    });

    it('devrait retourner un livre par son id', async () => {
      const query = `
        query {
          book(id: "${bookId}") {
            id
            title
            authors
            genre
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.book.title).toBe('Clean Code');
      expect(response.body.data.book.id).toBe(bookId);
    });

    it('devrait lever une erreur si le livre est introuvable', async () => {
      const query = `
        query {
          book(id: "00000000-0000-0000-0000-000000000000") {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          book(id: "${bookId}") {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── booksByGenre ────────────────────────────────────────────────

  describe('booksByGenre', () => {
    beforeEach(async () => {
      const prisma = getTestPrisma();
      await prisma.book.createMany({
        data: [
          {
            title: 'Clean Code',
            authors: 'Robert C. Martin',
            genre: 'Technologie',
          },
          {
            title: 'The Pragmatic Programmer',
            authors: 'David Thomas',
            genre: 'Technologie',
          },
          {
            title: 'Dune',
            authors: 'Frank Herbert',
            genre: 'Fiction',
          },
        ],
      });
    });

    it('devrait retourner les livres d\'un genre donné', async () => {
      const query = `
        query {
          booksByGenre(genre: "Technologie", page: 1, limit: 10) {
            id
            title
            genre
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.booksByGenre).toHaveLength(2);
      expect(response.body.data.booksByGenre[0].genre).toBe('Technologie');
    });

    it('devrait retourner un tableau vide si aucun livre pour ce genre', async () => {
      const query = `
        query {
          booksByGenre(genre: "GenreInexistant", page: 1, limit: 10) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.booksByGenre).toHaveLength(0);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          booksByGenre(genre: "Technologie", page: 1, limit: 10) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── searchBooks ────────────────────────────────────────────────

  describe('searchBooks', () => {
    it('devrait rechercher des livres via Google Books API et les mettre en cache', async () => {
      const query = `
        query {
          searchBooks(input: {
            query: "Clean Code"
            maxResults: 5
          }) {
            id
            title
            authors
            googleBooksId
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.searchBooks.length).toBeGreaterThan(0);
      expect(response.body.data.searchBooks[0].googleBooksId).toBeDefined();
    }, 15000);

    it('devrait mettre les résultats en cache en DB', async () => {
      const query = `
        query {
          searchBooks(input: {
            query: "The Pragmatic Programmer"
            maxResults: 3
          }) {
            id
            googleBooksId
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      const prisma = getTestPrisma();
      const booksInDb = await prisma.book.findMany({
        where: { googleBooksId: { not: null } },
      });

      expect(booksInDb.length).toBeGreaterThan(0);
    }, 15000);

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          searchBooks(input: { query: "Clean Code" }) {
            id
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });
});
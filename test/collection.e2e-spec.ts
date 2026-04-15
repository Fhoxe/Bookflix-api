import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper.js';
import { cleanDatabase, getTestPrisma } from './helpers/db.helper.js';
import { registerAndLogin, authHeader, TestUser } from './helpers/auth.helper.js';

describe('Collection (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let otherUser: TestUser;
  let bookId: string;

  beforeAll(async () => {
    app = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await closeTestApp();
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase();
    user = await registerAndLogin(app, 'test@bookflix.com', 'testuser');
    otherUser = await registerAndLogin(app, 'other@bookflix.com', 'otheruser');

    const prisma = getTestPrisma();
    const book = await prisma.book.create({
      data: { title: 'Clean Code', authors: 'Robert C. Martin', genre: 'Technologie' },
    });
    bookId = book.id;
  });

  // ─── addToCollection ────────────────────────────────────────────

  describe('addToCollection', () => {
    it('devrait ajouter un livre à la collection', async () => {
      const mutation = `
        mutation {
          addToCollection(input: {
            bookId: "${bookId}"
            status: TO_READ
          }) {
            id
            status
            bookId
            userId
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.addToCollection.status).toBe('TO_READ');
      expect(response.body.data.addToCollection.bookId).toBe(bookId);
    });

    it('devrait utiliser TO_READ par défaut si statut non fourni', async () => {
      const mutation = `
        mutation {
          addToCollection(input: {
            bookId: "${bookId}"
          }) {
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.addToCollection.status).toBe('TO_READ');
    });

    it('devrait lever une erreur si le livre est déjà dans la collection', async () => {
      const mutation = `
        mutation {
          addToCollection(input: { bookId: "${bookId}" }) {
            id
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si le livre est introuvable', async () => {
      const mutation = `
        mutation {
          addToCollection(input: {
            bookId: "00000000-0000-0000-0000-000000000000"
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

    it('devrait refuser l\'accès sans token', async () => {
      const mutation = `
        mutation {
          addToCollection(input: { bookId: "${bookId}" }) {
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

  // ─── updateCollectionStatus ──────────────────────────────────────

  describe('updateCollectionStatus', () => {
    beforeEach(async () => {
      const mutation = `
        mutation {
          addToCollection(input: {
            bookId: "${bookId}"
            status: TO_READ
          }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });
    });

    it('devrait mettre à jour le statut d\'un livre', async () => {
      const mutation = `
        mutation {
          updateCollectionStatus(input: {
            bookId: "${bookId}"
            status: READING
          }) {
            id
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateCollectionStatus.status).toBe('READING');
    });

    it('devrait pouvoir passer le statut à READ', async () => {
      const mutation = `
        mutation {
          updateCollectionStatus(input: {
            bookId: "${bookId}"
            status: READ
          }) {
            status
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateCollectionStatus.status).toBe('READ');
    });

    it('devrait lever une erreur si le livre n\'est pas dans la collection', async () => {
      const prisma = getTestPrisma();
      const otherBook = await prisma.book.create({
        data: { title: 'Autre livre', authors: 'Auteur', genre: 'Fiction' },
      });

      const mutation = `
        mutation {
          updateCollectionStatus(input: {
            bookId: "${otherBook.id}"
            status: READING
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser l\'accès sans token', async () => {
      const mutation = `
        mutation {
          updateCollectionStatus(input: {
            bookId: "${bookId}"
            status: READING
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── removeFromCollection ────────────────────────────────────────

  describe('removeFromCollection', () => {
    beforeEach(async () => {
      const mutation = `
        mutation {
          addToCollection(input: { bookId: "${bookId}" }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });
    });

    it('devrait retirer un livre de la collection', async () => {
      const mutation = `
        mutation {
          removeFromCollection(bookId: "${bookId}") {
            id
            bookId
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.removeFromCollection.bookId).toBe(bookId);
    });

    it('devrait lever une erreur si le livre n\'est pas dans la collection', async () => {
      const prisma = getTestPrisma();
      const otherBook = await prisma.book.create({
        data: { title: 'Autre livre', authors: 'Auteur', genre: 'Fiction' },
      });

      const mutation = `
        mutation {
          removeFromCollection(bookId: "${otherBook.id}") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser l\'accès sans token', async () => {
      const mutation = `
        mutation {
          removeFromCollection(bookId: "${bookId}") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── myCollection ────────────────────────────────────────────────

  describe('myCollection', () => {
    beforeEach(async () => {
      const prisma = getTestPrisma();
      const book2 = await prisma.book.create({
        data: { title: 'The Pragmatic Programmer', authors: 'David Thomas', genre: 'Technologie' },
      });

      const addMutation = (id: string) => `
        mutation {
          addToCollection(input: { bookId: "${id}" }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: addMutation(bookId) });

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: addMutation(book2.id) });
    });

    it('devrait retourner un PaginatedUserBooksType', async () => {
      const query = `
        query {
          myCollection(page: 1, limit: 10) {
            items {
              id
              status
              book { title }
            }
            total
            totalPages
            hasNextPage
            hasPreviousPage
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.myCollection.items).toHaveLength(2);
      expect(response.body.data.myCollection.total).toBe(2);
      expect(response.body.data.myCollection.items[0].book).toBeDefined();
    });

    it('devrait filtrer par statut', async () => {
      const updateMutation = `
        mutation {
          updateCollectionStatus(input: {
            bookId: "${bookId}"
            status: READ
          }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: updateMutation });

      const query = `
        query {
          myCollection(page: 1, limit: 10, status: READ) {
            items {
              id
              status
            }
            total
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.myCollection.items).toHaveLength(1);
      expect(response.body.data.myCollection.items[0].status).toBe('READ');
    });

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          myCollection(page: 1, limit: 10) {
            items { id }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── userCollection ──────────────────────────────────────────────

  describe('userCollection', () => {
    beforeEach(async () => {
      const addMutation = `
        mutation {
          addToCollection(input: { bookId: "${bookId}" }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: addMutation });
    });

    it('devrait retourner un PaginatedUserBooksType pour un utilisateur public', async () => {
      const targetUserId = otherUser.userId;

      const query = `
        query {
          userCollection(userId: "${targetUserId}", page: 1, limit: 10) {
            items {
              id
              status
              book { title }
            }
            total
            totalPages
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.userCollection.items).toHaveLength(1);
      expect(response.body.data.userCollection.total).toBe(1);
    });

    it('devrait lever une erreur si le profil est privé', async () => {
      const updateMutation = `
        mutation {
          updateProfile(input: { isPublic: false }) { isPublic }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: updateMutation });

      const targetUserId = otherUser.userId;

      const query = `
        query {
          userCollection(userId: "${targetUserId}", page: 1, limit: 10) {
            items { id }
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait retourner sa propre collection même si profil privé', async () => {
      const updateMutation = `
        mutation {
          updateProfile(input: { isPublic: false }) { isPublic }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: updateMutation });

      const targetUserId = otherUser.userId;

      const query = `
        query {
          userCollection(userId: "${targetUserId}", page: 1, limit: 10) {
            items { id status }
            total
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.userCollection.items).toHaveLength(1);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const targetUserId = otherUser.userId;

      const query = `
        query {
          userCollection(userId: "${targetUserId}", page: 1, limit: 10) {
            items { id }
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
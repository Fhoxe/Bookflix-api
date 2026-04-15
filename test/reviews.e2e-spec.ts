import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper.js';
import { cleanDatabase, getTestPrisma } from './helpers/db.helper.js';
import { registerAndLogin, authHeader, TestUser } from './helpers/auth.helper.js';
import { ReadingStatus } from '@prisma/client';

describe('Reviews (e2e)', () => {
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

  async function addBookToCollectionWithStatus(
    testUser: TestUser,
    status: ReadingStatus,
  ): Promise<void> {
    const prisma = getTestPrisma();
    await prisma.userBook.create({
      data: { userId: testUser.userId, bookId, status },
    });
  }

  // ─── createReview ────────────────────────────────────────────────

  describe('createReview', () => {
    it('devrait créer une review si le statut est READ', async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
            comment: "Excellent livre !"
          }) {
            id
            rating
            comment
            userId
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
      expect(response.body.data.createReview.rating).toBe(5);
      expect(response.body.data.createReview.comment).toBe('Excellent livre !');
      expect(response.body.data.createReview.userId).toBe(user.userId);
    });

    it('devrait lever une erreur si le livre n\'est pas dans la collection', async () => {
      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si le statut n\'est pas READ', async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READING);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si une review existe déjà', async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
          }) { id }
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

    it('devrait lever une erreur si la note est invalide', async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 6
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
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── updateReview ────────────────────────────────────────────────

  describe('updateReview', () => {
    let reviewId: string;

    beforeEach(async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
            comment: "Excellent livre !"
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      reviewId = response.body.data.createReview.id;
    });

    it('devrait mettre à jour une review', async () => {
      const mutation = `
        mutation {
          updateReview(
            id: "${reviewId}"
            input: { rating: 4, comment: "Très bon livre !" }
          ) {
            id
            rating
            comment
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateReview.rating).toBe(4);
      expect(response.body.data.updateReview.comment).toBe('Très bon livre !');
    });

    it('devrait mettre à jour uniquement la note', async () => {
      const mutation = `
        mutation {
          updateReview(
            id: "${reviewId}"
            input: { rating: 3 }
          ) {
            rating
            comment
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateReview.rating).toBe(3);
      expect(response.body.data.updateReview.comment).toBe('Excellent livre !');
    });

    it('devrait lever une erreur si la review est introuvable', async () => {
      const mutation = `
        mutation {
          updateReview(
            id: "00000000-0000-0000-0000-000000000000"
            input: { rating: 4 }
          ) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si l\'utilisateur n\'est pas le propriétaire', async () => {
      const mutation = `
        mutation {
          updateReview(
            id: "${reviewId}"
            input: { rating: 1 }
          ) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser l\'accès sans token', async () => {
      const mutation = `
        mutation {
          updateReview(
            id: "${reviewId}"
            input: { rating: 4 }
          ) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── deleteReview ────────────────────────────────────────────────

  describe('deleteReview', () => {
    let reviewId: string;

    beforeEach(async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
          }) { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      reviewId = response.body.data.createReview.id;
    });

    it('devrait supprimer une review', async () => {
      const mutation = `
        mutation {
          deleteReview(id: "${reviewId}") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.deleteReview.id).toBe(reviewId);
    });

    it('devrait lever une erreur si la review est introuvable', async () => {
      const mutation = `
        mutation {
          deleteReview(id: "00000000-0000-0000-0000-000000000000") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si l\'utilisateur n\'est pas le propriétaire', async () => {
      const mutation = `
        mutation {
          deleteReview(id: "${reviewId}") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait refuser l\'accès sans token', async () => {
      const mutation = `
        mutation {
          deleteReview(id: "${reviewId}") { id }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── bookReviews ─────────────────────────────────────────────────

  describe('bookReviews', () => {
    beforeEach(async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);
      await addBookToCollectionWithStatus(otherUser, ReadingStatus.READ);

      const createReview = (token: string, rating: number) => `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: ${rating}
            comment: "Commentaire ${rating}"
          }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: createReview(user.accessToken, 5) });

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: createReview(otherUser.accessToken, 3) });
    });

    it('devrait retourner un PaginatedReviewsType pour un livre', async () => {
      const targetBookId = bookId;

      const query = `
        query {
          bookReviews(bookId: "${targetBookId}", page: 1, limit: 10) {
            items {
              id
              rating
              comment
              userId
            }
            total
            totalPages
            hasNextPage
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.bookReviews.items).toHaveLength(2);
      expect(response.body.data.bookReviews.total).toBe(2);
    });

    it('devrait retourner items vide si aucune review', async () => {
      const prisma = getTestPrisma();
      const otherBook = await prisma.book.create({
        data: { title: 'Autre livre', authors: 'Auteur', genre: 'Fiction' },
      });

      const targetBookId = otherBook.id;

      const query = `
        query {
          bookReviews(bookId: "${targetBookId}", page: 1, limit: 10) {
            items { id }
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
      expect(response.body.data.bookReviews.items).toHaveLength(0);
      expect(response.body.data.bookReviews.total).toBe(0);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const targetBookId = bookId;

      const query = `
        query {
          bookReviews(bookId: "${targetBookId}", page: 1, limit: 10) {
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

  // ─── userReviews ──────────────────────────────────────────────────

  describe('userReviews', () => {
    beforeEach(async () => {
      await addBookToCollectionWithStatus(user, ReadingStatus.READ);

      const mutation = `
        mutation {
          createReview(input: {
            bookId: "${bookId}"
            rating: 5
            comment: "Excellent !"
          }) { id }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });
    });

    it('devrait retourner un PaginatedReviewsType pour un utilisateur', async () => {
      const targetUserId = user.userId;

      const query = `
        query {
          userReviews(userId: "${targetUserId}", page: 1, limit: 10) {
            items {
              id
              rating
              comment
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
      expect(response.body.data.userReviews.items).toHaveLength(1);
      expect(response.body.data.userReviews.total).toBe(1);
      expect(response.body.data.userReviews.items[0].book).toBeDefined();
      expect(response.body.data.userReviews.items[0].book.title).toBe('Clean Code');
    });

    it('devrait retourner items vide si l\'utilisateur n\'a pas de reviews', async () => {
      const targetUserId = otherUser.userId;

      const query = `
        query {
          userReviews(userId: "${targetUserId}", page: 1, limit: 10) {
            items { id }
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
      expect(response.body.data.userReviews.items).toHaveLength(0);
      expect(response.body.data.userReviews.total).toBe(0);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const targetUserId = user.userId;

      const query = `
        query {
          userReviews(userId: "${targetUserId}", page: 1, limit: 10) {
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
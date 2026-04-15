import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper.js';
import { cleanDatabase } from './helpers/db.helper.js';
import { registerAndLogin, authHeader, TestUser } from './helpers/auth.helper.js';

// ─── Tests ────────────────────────────────────────────────────────

describe('Users (e2e)', () => {
  let app: INestApplication;
  let user: TestUser;
  let otherUser: TestUser;

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
  });

  // ─── me ─────────────────────────────────────────────────────────

  describe('me', () => {
    it('devrait retourner le profil complet de l\'utilisateur connecté', async () => {
      const query = `
        query {
          me {
            id
            email
            username
            isPublic
            createdAt
            updatedAt
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.me.email).toBe('test@bookflix.com');
      expect(response.body.data.me.username).toBe('testuser');
      expect(response.body.data.me.isPublic).toBe(true);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          me {
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

  // ─── user ────────────────────────────────────────────────────────

  describe('user', () => {
    it('devrait retourner le profil public d\'un autre utilisateur', async () => {
      const query = `
        query {
          user(id: "${otherUser.userId}") {
            id
            username
            isPublic
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.user.username).toBe('otheruser');
      expect(response.body.data.user.isPublic).toBe(true);
    });

    it('devrait retourner le profil complet si c\'est le propriétaire', async () => {
      const query = `
        query {
          user(id: "${user.userId}") {
            id
            username
            isPublic
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('devrait lever une erreur si l\'utilisateur est introuvable', async () => {
      const query = `
        query {
          user(id: "00000000-0000-0000-0000-000000000000") {
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

    it('devrait lever une erreur si le profil est privé', async () => {
      const updateMutation = `
        mutation {
          updateProfile(input: { isPublic: false }) {
            isPublic
          }
        }
      `;

      await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(otherUser.accessToken))
        .send({ query: updateMutation });

      const query = `
        query {
          user(id: "${otherUser.userId}") {
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
          user(id: "${otherUser.userId}") {
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

  // ─── updateProfile ───────────────────────────────────────────────

  describe('updateProfile', () => {
    it('devrait mettre à jour le profil de l\'utilisateur connecté', async () => {
      const mutation = `
        mutation {
          updateProfile(input: {
            bio: "Passionné de lecture"
            isPublic: false
          }) {
            id
            bio
            isPublic
            updatedAt
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile.bio).toBe('Passionné de lecture');
      expect(response.body.data.updateProfile.isPublic).toBe(false);
    });

    it('devrait mettre à jour uniquement les champs fournis', async () => {
      const mutation = `
        mutation {
          updateProfile(input: {
            bio: "Ma nouvelle bio"
          }) {
            id
            bio
            isPublic
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader(user.accessToken))
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateProfile.bio).toBe('Ma nouvelle bio');
      expect(response.body.data.updateProfile.isPublic).toBe(true);
    });

    it('devrait lever une erreur si l\'avatar n\'est pas une URL valide', async () => {
      const mutation = `
        mutation {
          updateProfile(input: {
            avatar: "pas-une-url"
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

    it('devrait refuser la mise à jour sans token', async () => {
      const mutation = `
        mutation {
          updateProfile(input: { bio: "Test" }) {
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
});
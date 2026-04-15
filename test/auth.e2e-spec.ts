import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from './helpers/app.helper.js';
import { cleanDatabase } from './helpers/db.helper.js';
import { registerAndLogin, authHeader } from './helpers/auth.helper.js';

// ─── Tests ────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp();
  }, 30000);

  beforeEach(async () => {
    await cleanDatabase();
  });

  // ─── register ───────────────────────────────────────────────────

  describe('register', () => {
    it('devrait créer un utilisateur et retourner un token', async () => {
      const mutation = `
        mutation {
          register(input: {
            email: "test@bookflix.com"
            username: "testuser"
            password: "password123"
          }) {
            accessToken
            userId
            username
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.register.accessToken).toBeDefined();
      expect(response.body.data.register.username).toBe('testuser');
      expect(response.body.errors).toBeUndefined();
    });

    it('devrait lever une erreur si l\'email est déjà utilisé', async () => {
      await registerAndLogin(app, 'test@bookflix.com', 'testuser');

      const mutation = `
        mutation {
          register(input: {
            email: "test@bookflix.com"
            username: "autreuser"
            password: "password123"
          }) {
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('email');
    });

    it('devrait lever une erreur si le username est déjà utilisé', async () => {
      await registerAndLogin(app, 'test@bookflix.com', 'testuser');

      const mutation = `
        mutation {
          register(input: {
            email: "autre@bookflix.com"
            username: "testuser"
            password: "password123"
          }) {
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si le mot de passe est trop court', async () => {
      const mutation = `
        mutation {
          register(input: {
            email: "test@bookflix.com"
            username: "testuser"
            password: "123"
          }) {
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── login ──────────────────────────────────────────────────────

  describe('login', () => {
    it('devrait retourner un token si les credentials sont valides', async () => {
      await registerAndLogin(app, 'test@bookflix.com', 'testuser');

      const mutation = `
        mutation {
          login(input: {
            email: "test@bookflix.com"
            password: "password123"
          }) {
            accessToken
            userId
            username
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.status).toBe(200);
      expect(response.body.data.login.accessToken).toBeDefined();
      expect(response.body.data.login.username).toBe('testuser');
      expect(response.body.errors).toBeUndefined();
    });

    it('devrait lever une erreur si l\'email est inconnu', async () => {
      const mutation = `
        mutation {
          login(input: {
            email: "inconnu@bookflix.com"
            password: "password123"
          }) {
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });

    it('devrait lever une erreur si le mot de passe est incorrect', async () => {
      await registerAndLogin(app, 'test@bookflix.com', 'testuser');

      const mutation = `
        mutation {
          login(input: {
            email: "test@bookflix.com"
            password: "mauvaismdp"
          }) {
            accessToken
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation });

      expect(response.body.errors).toBeDefined();
    });
  });

  // ─── protection JWT ─────────────────────────────────────────────

  describe('protection JWT', () => {
    it('devrait refuser l\'accès sans token', async () => {
      const query = `
        query {
          me {
            id
            username
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query });

      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].message).toContain('Unauthorized');
    });

    it('devrait refuser l\'accès avec un token invalide', async () => {
      const query = `
        query {
          me {
            id
            username
          }
        }
      `;

      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set(authHeader('token_invalide'))
        .send({ query });

      expect(response.body.errors).toBeDefined();
    });
  });
});
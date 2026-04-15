import request from 'supertest';
import { INestApplication } from '@nestjs/common';

export interface TestUser {
  accessToken: string;
  userId: string;
  username: string;
}

export async function registerAndLogin(
  app: INestApplication,
  email: string,
  username: string,
  password = 'password123',
): Promise<TestUser> {
  const registerMutation = `
    mutation {
      register(input: {
        email: "${email}"
        username: "${username}"
        password: "${password}"
      }) {
        accessToken
        userId
        username
      }
    }
  `;

  const response = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: registerMutation });

  return response.body.data.register as TestUser;
}

export function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import * as bcrypt from 'bcrypt';

// ─── Mocks ────────────────────────────────────────────────────────

const mockUser = {
  id: 'uuid-123',
  email: 'test@bookflix.com',
  username: 'testuser',
  password: 'hashed_password',
  bio: null,
  avatar: null,
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthRepository = {
  findUserByEmail: jest.fn(),
  findUserByUsername: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock_jwt_token'),
};

// ─── Tests ────────────────────────────────────────────────────────

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockAuthRepository },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // ─── register ───────────────────────────────────────────────────

  describe('register', () => {
    const registerInput = {
      email: 'test@bookflix.com',
      username: 'testuser',
      password: 'password123',
    };

    it('devrait créer un utilisateur et retourner un token', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await authService.register(registerInput);

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.userId).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(mockAuthRepository.createUser).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une ConflictException si email déjà utilisé', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it("devrait lever une ConflictException si username déjà utilisé", async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(mockUser);

      await expect(authService.register(registerInput)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it('devrait hasher le mot de passe avant de créer', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      await authService.register(registerInput);

      const createUserCall = mockAuthRepository.createUser.mock.calls[0][0] as {
        password: string;
      };
      expect(createUserCall.password).not.toBe(registerInput.password);
      expect(
        await bcrypt.compare(registerInput.password, createUserCall.password),
      ).toBe(true);
    });
  });

  // ─── login ──────────────────────────────────────────────────────

  describe('login', () => {
    const loginInput = {
      email: 'test@bookflix.com',
      password: 'password123',
    };

    it('devrait retourner un token si les credentials sont valides', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await authService.login(loginInput);

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.userId).toBe(mockUser.id);
    });

    it('devrait lever une UnauthorizedException si email inconnu', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('devrait lever une UnauthorizedException si mot de passe incorrect', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('autrepassword', 12),
      });

      await expect(authService.login(loginInput)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
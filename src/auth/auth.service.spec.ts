import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { RegisterInput } from './dto/register.input.js';
import { LoginInput } from './dto/login.input.js';
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

const mockRegisterInput: RegisterInput = {
  email: 'test@bookflix.com',
  username: 'testuser',
  password: 'password123',
};

const mockLoginInput: LoginInput = {
  email: 'test@bookflix.com',
  password: 'password123',
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

const repositoryError = new Error('Erreur base de données');

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
    it('devrait créer un utilisateur et retourner un token', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      const result = await authService.register(mockRegisterInput);

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.userId).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
      expect(mockAuthRepository.createUser).toHaveBeenCalledTimes(1);
    });

    it('devrait hasher le mot de passe avant de créer', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(null);
      mockAuthRepository.createUser.mockResolvedValue(mockUser);

      await authService.register(mockRegisterInput);

      const createUserCall = mockAuthRepository.createUser.mock.calls[0][0] as {
        password: string;
      };
      expect(createUserCall.password).not.toBe(mockRegisterInput.password);
      expect(
        await bcrypt.compare(mockRegisterInput.password, createUserCall.password),
      ).toBe(true);
    });

    it('devrait lever une ConflictException si email déjà utilisé', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(mockRegisterInput)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it('devrait lever une ConflictException si username déjà utilisé', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(mockUser);

      await expect(authService.register(mockRegisterInput)).rejects.toThrow(
        ConflictException,
      );
      expect(mockAuthRepository.createUser).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue à la création', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);
      mockAuthRepository.findUserByUsername.mockResolvedValue(null);
      mockAuthRepository.createUser.mockRejectedValue(repositoryError);

      await expect(authService.register(mockRegisterInput)).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });

  // ─── login ──────────────────────────────────────────────────────

  describe('login', () => {
    it('devrait retourner un token si les credentials sont valides', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        ...mockUser,
        password: hashedPassword,
      });

      const result = await authService.login(mockLoginInput);

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.userId).toBe(mockUser.id);
      expect(result.username).toBe(mockUser.username);
    });

    it('devrait lever une UnauthorizedException si email inconnu', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue(null);

      await expect(authService.login(mockLoginInput)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('devrait lever une UnauthorizedException si mot de passe incorrect', async () => {
      mockAuthRepository.findUserByEmail.mockResolvedValue({
        ...mockUser,
        password: await bcrypt.hash('autrepassword', 12),
      });

      await expect(authService.login(mockLoginInput)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockAuthRepository.findUserByEmail.mockRejectedValue(repositoryError);

      await expect(authService.login(mockLoginInput)).rejects.toThrow(
        'Erreur base de données',
      );
    });
  });
});
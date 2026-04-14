import { Test, TestingModule } from '@nestjs/testing';
import { AuthRepository } from './auth.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';

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

const mockCreateUserData = {
  email: 'test@bookflix.com',
  username: 'testuser',
  password: 'hashed_password',
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

const prismaError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('AuthRepository', () => {
  let authRepository: AuthRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    authRepository = module.get<AuthRepository>(AuthRepository);
    jest.clearAllMocks();
  });

  // ─── findUserByEmail ────────────────────────────────────────────

  describe('findUserByEmail', () => {
    it('devrait retourner un utilisateur par son email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authRepository.findUserByEmail('test@bookflix.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@bookflix.com' },
      });
    });

    it('devrait retourner null si aucun utilisateur trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findUserByEmail('inconnu@bookflix.com');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        authRepository.findUserByEmail('test@bookflix.com'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findUserByUsername ─────────────────────────────────────────

  describe('findUserByUsername', () => {
    it('devrait retourner un utilisateur par son username', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authRepository.findUserByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('devrait retourner null si aucun utilisateur trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findUserByUsername('inconnu');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        authRepository.findUserByUsername('testuser'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findUserById ───────────────────────────────────────────────

  describe('findUserById', () => {
    it('devrait retourner un utilisateur par son id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authRepository.findUserById('uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'uuid-123' },
      });
    });

    it('devrait retourner null si aucun utilisateur trouvé', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await authRepository.findUserById('uuid-inexistant');

      expect(result).toBeNull();
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        authRepository.findUserById('uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── createUser ─────────────────────────────────────────────────

  describe('createUser', () => {
    it('devrait créer et retourner un utilisateur', async () => {
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await authRepository.createUser(mockCreateUserData);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: mockCreateUserData,
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledTimes(1);
      });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.create.mockRejectedValue(prismaError);

      await expect(
        authRepository.createUser(mockCreateUserData),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { UsersRepository } from './users.repository.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateProfileInput } from './dto/update-profile.input.js';

// ─── Mocks ────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-123',
  email: 'test@bookflix.com',
  username: 'testuser',
  password: 'hashed_password',
  bio: 'Ma bio',
  avatar: 'https://example.com/avatar.jpg',
  isPublic: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUpdateProfileInput: UpdateProfileInput = {
  bio: 'Nouvelle bio',
  avatar: 'https://example.com/new-avatar.jpg',
  isPublic: false,
};

const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const prismaError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('UsersRepository', () => {
  let usersRepository: UsersRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    usersRepository = module.get<UsersRepository>(UsersRepository);
    jest.clearAllMocks();
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('devrait retourner un utilisateur par son id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersRepository.findById('user-uuid-123');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si l\'utilisateur est introuvable', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersRepository.findById('user-uuid-inexistant');

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        usersRepository.findById('user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByEmail ────────────────────────────────────────────────

  describe('findByEmail', () => {
    it('devrait retourner un utilisateur par son email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersRepository.findByEmail('test@bookflix.com');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@bookflix.com' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si l\'utilisateur est introuvable', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersRepository.findByEmail('inconnu@bookflix.com');

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        usersRepository.findByEmail('test@bookflix.com'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── findByUsername ─────────────────────────────────────────────

  describe('findByUsername', () => {
    it('devrait retourner un utilisateur par son username', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await usersRepository.findByUsername('testuser');

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner null si l\'utilisateur est introuvable', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await usersRepository.findByUsername('inconnu');

      expect(result).toBeNull();
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.findUnique.mockRejectedValue(prismaError);

      await expect(
        usersRepository.findByUsername('testuser'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── update ─────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait mettre à jour le profil et retourner l\'utilisateur', async () => {
      const updatedUser = {
        ...mockUser,
        bio: 'Nouvelle bio',
        avatar: 'https://example.com/new-avatar.jpg',
        isPublic: false,
      };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await usersRepository.update(
        'user-uuid-123',
        mockUpdateProfileInput,
      );

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
        data: {
          bio: 'Nouvelle bio',
          avatar: 'https://example.com/new-avatar.jpg',
          isPublic: false,
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledTimes(1);
    });

    it('devrait mettre à jour uniquement les champs fournis', async () => {
      const updatedUser = { ...mockUser, bio: 'Nouvelle bio' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      await usersRepository.update('user-uuid-123', { bio: 'Nouvelle bio' });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-123' },
        data: { bio: 'Nouvelle bio' },
      });
    });

    it('devrait lever une erreur si Prisma échoue', async () => {
      mockPrismaService.user.update.mockRejectedValue(prismaError);

      await expect(
        usersRepository.update('user-uuid-123', mockUpdateProfileInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
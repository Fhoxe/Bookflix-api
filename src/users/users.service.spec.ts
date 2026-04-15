import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
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

const mockPrivateUser = {
  ...mockUser,
  id: 'user-uuid-456',
  isPublic: false,
};

const mockUserType = {
  id: 'user-uuid-123',
  username: 'testuser',
  bio: 'Ma bio',
  avatar: 'https://example.com/avatar.jpg',
  isPublic: true,
  createdAt: mockUser.createdAt,
};

const mockUserProfileType = {
  id: 'user-uuid-123',
  email: 'test@bookflix.com',
  username: 'testuser',
  bio: 'Ma bio',
  avatar: 'https://example.com/avatar.jpg',
  isPublic: true,
  createdAt: mockUser.createdAt,
  updatedAt: mockUser.updatedAt,
};

const mockUpdateProfileInput: UpdateProfileInput = {
  bio: 'Nouvelle bio',
  avatar: 'https://example.com/new-avatar.jpg',
  isPublic: false,
};

const mockUsersRepository = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
};

const repositoryError = new Error('Erreur base de données');

// ─── Tests ────────────────────────────────────────────────────────

describe('UsersService', () => {
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockUsersRepository },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  // ─── findById ───────────────────────────────────────────────────

  describe('findById', () => {
    it('devrait retourner { isPublic } si l\'utilisateur existe', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.findById('user-uuid-123');

      expect(result).toEqual({ isPublic: true });
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-uuid-123');
      expect(mockUsersRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner { isPublic: false } si le profil est privé', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockPrivateUser);

      const result = await usersService.findById('user-uuid-456');

      expect(result).toEqual({ isPublic: false });
    });

    it('devrait lever une NotFoundException si l\'utilisateur est introuvable', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        usersService.findById('user-uuid-inexistant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockUsersRepository.findById.mockRejectedValue(repositoryError);

      await expect(
        usersService.findById('user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getMyProfile ───────────────────────────────────────────────

  describe('getMyProfile', () => {
    it('devrait retourner le profil complet du propriétaire', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.getMyProfile('user-uuid-123');

      expect(result).toEqual(mockUserProfileType);
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-uuid-123');
      expect(mockUsersRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si l\'utilisateur est introuvable', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        usersService.getMyProfile('user-uuid-inexistant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockUsersRepository.findById.mockRejectedValue(repositoryError);

      await expect(
        usersService.getMyProfile('user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── getUserProfile ─────────────────────────────────────────────

  describe('getUserProfile', () => {
    it('devrait retourner le profil complet si le requester est le propriétaire', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.getUserProfile(
        'user-uuid-123',
        'user-uuid-123',
      );

      expect(result).toEqual(mockUserProfileType);
      expect(mockUsersRepository.findById).toHaveBeenCalledTimes(1);
    });

    it('devrait retourner le profil public si le profil est public', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await usersService.getUserProfile(
        'requester-uuid',
        'user-uuid-123',
      );

      expect(result).toEqual(mockUserType);
      expect((result as any).email).toBeUndefined();
    });

    it('devrait lever une ForbiddenException si le profil est privé', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockPrivateUser);

      await expect(
        usersService.getUserProfile('requester-uuid', 'user-uuid-456'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever une NotFoundException si l\'utilisateur est introuvable', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        usersService.getUserProfile('requester-uuid', 'user-uuid-inexistant'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait lever une erreur si le repository échoue', async () => {
      mockUsersRepository.findById.mockRejectedValue(repositoryError);

      await expect(
        usersService.getUserProfile('requester-uuid', 'user-uuid-123'),
      ).rejects.toThrow('Erreur base de données');
    });
  });

  // ─── updateProfile ──────────────────────────────────────────────

  describe('updateProfile', () => {
    it('devrait mettre à jour le profil et retourner un UserProfileType', async () => {
      const updatedUser = {
        ...mockUser,
        bio: 'Nouvelle bio',
        avatar: 'https://example.com/new-avatar.jpg',
        isPublic: false,
      };
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.update.mockResolvedValue(updatedUser);

      const result = await usersService.updateProfile(
        'user-uuid-123',
        mockUpdateProfileInput,
      );

      expect(result.bio).toBe('Nouvelle bio');
      expect(result.isPublic).toBe(false);
      expect(mockUsersRepository.update).toHaveBeenCalledWith(
        'user-uuid-123',
        mockUpdateProfileInput,
      );
      expect(mockUsersRepository.update).toHaveBeenCalledTimes(1);
    });

    it('devrait lever une NotFoundException si l\'utilisateur est introuvable', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        usersService.updateProfile('user-uuid-inexistant', mockUpdateProfileInput),
      ).rejects.toThrow(NotFoundException);

      expect(mockUsersRepository.update).not.toHaveBeenCalled();
    });

    it('devrait lever une erreur si le repository échoue à la mise à jour', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.update.mockRejectedValue(repositoryError);

      await expect(
        usersService.updateProfile('user-uuid-123', mockUpdateProfileInput),
      ).rejects.toThrow('Erreur base de données');
    });
  });
});
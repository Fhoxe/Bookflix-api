import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { UsersRepository } from './users.repository.js';
import { UpdateProfileInput } from './dto/update-profile.input.js';
import { UserType } from './dto/user.type.js';
import { UserProfileType } from './dto/user-profile.type.js';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findById(id: string): Promise<{ isPublic: boolean }> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return { isPublic: user.isPublic };
  }

  async getMyProfile(userId: string): Promise<UserProfileType> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    return this.toUserProfileType(user);
  }

  async getUserProfile(
    requesterId: string,
    targetUserId: string,
  ): Promise<UserType | UserProfileType> {
    const user = await this.usersRepository.findById(targetUserId);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    if (requesterId === targetUserId) {
      return this.toUserProfileType(user);
    }

    if (!user.isPublic) {
      throw new ForbiddenException('Ce profil est privé');
    }

    return this.toUserType(user);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserProfileType> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }

    const updatedUser = await this.usersRepository.update(userId, input);
    return this.toUserProfileType(updatedUser);
  }

  private toUserType(user: User): UserType {
    return {
      id: user.id,
      username: user.username,
      isPublic: user.isPublic,
      createdAt: user.createdAt,
      bio: user.bio ?? undefined,
      avatar: user.avatar ?? undefined,
    };
  }

  private toUserProfileType(user: User): UserProfileType {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      isPublic: user.isPublic,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      bio: user.bio ?? undefined,
      avatar: user.avatar ?? undefined,
    };
  }
}
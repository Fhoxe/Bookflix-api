import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { User } from '@prisma/client';
import { UpdateProfileInput } from './dto/update-profile.input.js';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async update(id: string, input: UpdateProfileInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.bio !== undefined && { bio: input.bio }),
        ...(input.avatar !== undefined && { avatar: input.avatar }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      },
    });
  }
}
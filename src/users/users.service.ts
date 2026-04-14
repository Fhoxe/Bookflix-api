import { Injectable } from '@nestjs/common';

// Stub temporaire
@Injectable()
export class UsersService {
  async findById(_id: string): Promise<{ isPublic: boolean }> {
    return { isPublic: true };
  }
}
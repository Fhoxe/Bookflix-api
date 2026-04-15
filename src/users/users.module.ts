import { Module } from '@nestjs/common';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';

@Module({
  providers: [UsersResolver, UsersService, UsersRepository],
  exports: [UsersService],
})
export class UsersModule {}
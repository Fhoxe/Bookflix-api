import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UserType } from './dto/user.type.js';
import { UserProfileType } from './dto/user-profile.type.js';
import { UpdateProfileInput } from './dto/update-profile.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator.js';

@Resolver()
@UseGuards(JwtAuthGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => UserProfileType)
  async me(@CurrentUser() user: JwtPayload): Promise<UserProfileType> {
    return this.usersService.getMyProfile(user.sub);
  }

  @Query(() => UserType)
  async user(
    @CurrentUser() requester: JwtPayload,
    @Args('id') id: string,
  ): Promise<UserType | UserProfileType> {
    return this.usersService.getUserProfile(requester.sub, id);
  }

  @Mutation(() => UserProfileType)
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: UpdateProfileInput,
  ): Promise<UserProfileType> {
    return this.usersService.updateProfile(user.sub, input);
  }
}
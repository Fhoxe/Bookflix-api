import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReadingStatus } from '@prisma/client';
import { CollectionService } from './collection.service.js';
import { UserBookType } from './dto/user-book.type.js';
import { AddToCollectionInput } from './dto/add-to-collection.input.js';
import { UpdateCollectionStatusInput } from './dto/update-collection-status.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator.js';
import { UsersService } from '../users/users.service.js';

@Resolver(() => UserBookType)
@UseGuards(JwtAuthGuard)
export class CollectionResolver {
  constructor(
    private readonly collectionService: CollectionService,
    private readonly usersService: UsersService,
  ) {}

  @Mutation(() => UserBookType)
  async addToCollection(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: AddToCollectionInput,
  ): Promise<UserBookType> {
    return this.collectionService.addToCollection(user.sub, input);
  }

  @Mutation(() => UserBookType)
  async updateCollectionStatus(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: UpdateCollectionStatusInput,
  ): Promise<UserBookType> {
    return this.collectionService.updateStatus(user.sub, input);
  }

  @Mutation(() => UserBookType)
  async removeFromCollection(
    @CurrentUser() user: JwtPayload,
    @Args('bookId') bookId: string,
  ): Promise<UserBookType> {
    return this.collectionService.removeFromCollection(user.sub, bookId);
  }

  @Query(() => [UserBookType])
  async myCollection(
    @CurrentUser() user: JwtPayload,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('status', { type: () => ReadingStatus, nullable: true }) status?: ReadingStatus,
  ): Promise<UserBookType[]> {
    return this.collectionService.getMyCollection(user.sub, page, limit, status);
  }

  @Query(() => [UserBookType])
  async userCollection(
    @CurrentUser() user: JwtPayload,
    @Args('userId') targetUserId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
    @Args('status', { type: () => ReadingStatus, nullable: true }) status?: ReadingStatus,
  ): Promise<UserBookType[]> {
    const targetUser = await this.usersService.findById(targetUserId);

    return this.collectionService.getUserCollection(
      user.sub,
      targetUserId,
      page,
      limit,
      status,
      targetUser.isPublic,
    );
  }
}
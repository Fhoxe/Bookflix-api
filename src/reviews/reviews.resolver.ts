import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { ReviewType } from './dto/review.type.js';
import { CreateReviewInput } from './dto/create-review.input.js';
import { UpdateReviewInput } from './dto/update-review.input.js';
import { JwtAuthGuard } from '../auth/guards/jwt.guard.js';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator.js';

@Resolver(() => ReviewType)
@UseGuards(JwtAuthGuard)
export class ReviewsResolver {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Mutation(() => ReviewType)
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Args('input') input: CreateReviewInput,
  ): Promise<ReviewType> {
    return this.reviewsService.createReview(user.sub, input);
  }

  @Mutation(() => ReviewType)
  async updateReview(
    @CurrentUser() user: JwtPayload,
    @Args('id') id: string,
    @Args('input') input: UpdateReviewInput,
  ): Promise<ReviewType> {
    return this.reviewsService.updateReview(user.sub, id, input);
  }

  @Mutation(() => ReviewType)
  async deleteReview(
    @CurrentUser() user: JwtPayload,
    @Args('id') id: string,
  ): Promise<ReviewType> {
    return this.reviewsService.deleteReview(user.sub, id);
  }

  @Query(() => [ReviewType])
  async bookReviews(
    @Args('bookId') bookId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<ReviewType[]> {
    return this.reviewsService.getBookReviews(bookId, page, limit);
  }

  @Query(() => [ReviewType])
  async userReviews(
    @Args('userId') userId: string,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 10 }) limit: number,
  ): Promise<ReviewType[]> {
    return this.reviewsService.getUserReviews(userId, page, limit);
  }
}
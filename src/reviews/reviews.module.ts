import { Module } from '@nestjs/common';
import { ReviewsResolver } from './reviews.resolver.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsRepository } from './reviews.repository.js';
import { CollectionModule } from '../collection/collection.module.js';

@Module({
  imports: [CollectionModule],
  providers: [ReviewsResolver, ReviewsService, ReviewsRepository],
})
export class ReviewsModule {}
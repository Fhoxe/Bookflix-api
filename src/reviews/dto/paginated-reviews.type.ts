import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/dto/paginated.type.js';
import { ReviewType } from './review.type.js';

@ObjectType()
export class PaginatedReviewsType extends Paginated(ReviewType) {}
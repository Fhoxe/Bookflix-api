import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/dto/paginated.type.js';
import { UserBookType } from './user-book.type.js';

@ObjectType()
export class PaginatedUserBooksType extends Paginated(UserBookType) {}
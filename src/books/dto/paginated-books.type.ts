import { ObjectType } from '@nestjs/graphql';
import { Paginated } from '../../common/dto/paginated.type.js';
import { BookType } from './book.type.js';

@ObjectType()
export class PaginatedBooksType extends Paginated(BookType) {}
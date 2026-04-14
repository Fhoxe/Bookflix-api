import { ObjectType, Field, Int } from '@nestjs/graphql';
import { BookType } from '../../books/dto/book.type.js';

@ObjectType()
export class ReviewType {
  @Field()
  id!: string;

  @Field(() => Int)
  rating!: number;

  @Field({ nullable: true })
  comment?: string;

  @Field()
  userId!: string;

  @Field()
  bookId!: string;

  @Field(() => BookType, { nullable: true })
  book?: BookType;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
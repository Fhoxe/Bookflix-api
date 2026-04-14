import { ObjectType, Field, registerEnumType } from '@nestjs/graphql';
import { ReadingStatus } from '@prisma/client';
import { BookType } from '../../books/dto/book.type.js';

registerEnumType(ReadingStatus, {
  name: 'ReadingStatus',
  description: 'Statut de lecture d\'un livre dans la collection',
  valuesMap: {
    TO_READ: { description: 'À lire' },
    READING: { description: 'En cours de lecture' },
    READ: { description: 'Lu' },
  },
});

@ObjectType()
export class UserBookType {
  @Field()
  id!: string;

  @Field(() => ReadingStatus)
  status!: ReadingStatus;

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
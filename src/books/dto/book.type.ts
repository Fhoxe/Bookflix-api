import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
export class BookType {
  @Field()
  id!: string;

  @Field({ nullable: true })
  googleBooksId?: string;

  @Field()
  title!: string;

  @Field()
  authors!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  publishedYear?: number;

  @Field({ nullable: true })
  genre?: string;

  @Field({ nullable: true })
  coverUrl?: string;

  @Field({ nullable: true })
  isbn?: string;

  @Field()
  lastSyncedAt!: Date;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}
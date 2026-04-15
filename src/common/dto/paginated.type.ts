import { Field, Int, ObjectType } from '@nestjs/graphql';

export function Paginated<T>(ItemType: new () => T) {
  @ObjectType({ isAbstract: true })
  abstract class PaginatedType {
    @Field(() => [ItemType])
    items!: T[];

    @Field(() => Int)
    total!: number;

    @Field(() => Int)
    page!: number;

    @Field(() => Int)
    limit!: number;

    @Field(() => Int)
    totalPages!: number;

    @Field()
    hasNextPage!: boolean;

    @Field()
    hasPreviousPage!: boolean;
  }

  return PaginatedType;
}
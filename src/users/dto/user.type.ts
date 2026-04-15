import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field()
  id!: string;

  @Field()
  username!: string;

  @Field({ nullable: true })
  bio?: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  isPublic!: boolean;

  @Field()
  createdAt!: Date;
}
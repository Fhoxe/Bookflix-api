import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class UserProfileType {
  @Field()
  id!: string;

  @Field()
  email!: string;

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

  @Field()
  updatedAt!: Date;
}
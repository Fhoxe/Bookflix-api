import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken!: string;

  @Field()
  userId!: string;

  @Field()
  username!: string;
}
import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @IsEmail({}, { message: "Format d'email invalide" })
  email!: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  password!: string;
}
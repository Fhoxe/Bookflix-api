import { InputType, Field } from '@nestjs/graphql';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

@InputType()
export class RegisterInput {
  @Field()
  @IsEmail({}, { message: "Format d'email invalide" })
  email!: string;

  @Field()
  @IsString()
  @MinLength(3, { message: "Le nom d'utilisateur doit faire au moins 3 caractères" })
  @MaxLength(30, { message: "Le nom d'utilisateur ne peut pas dépasser 30 caractères" })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, - et _",
  })
  username!: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères' })
  @MaxLength(100, { message: 'Le mot de passe ne peut pas dépasser 100 caractères' })
  password!: string;
}
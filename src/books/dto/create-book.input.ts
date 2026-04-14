import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

@InputType()
export class CreateBookInput {
  @Field()
  @IsString()
  @MinLength(1, { message: 'Le titre ne peut pas être vide' })
  @MaxLength(255, { message: 'Le titre ne peut pas dépasser 255 caractères' })
  title!: string;

  @Field()
  @IsString()
  @MinLength(1, { message: "L'auteur ne peut pas être vide" })
  authors!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1000, { message: "L'année de publication semble invalide" })
  @Max(new Date().getFullYear(), {
    message: "L'année de publication ne peut pas être dans le futur",
  })
  publishedYear?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  genre?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  isbn?: string;
}
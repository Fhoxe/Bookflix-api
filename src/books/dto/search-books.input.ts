import { InputType, Field, Int } from '@nestjs/graphql';
import {
  IsString,
  MinLength,
  IsInt,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

@InputType()
export class SearchBooksInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'La recherche doit faire au moins 2 caractères' })
  query?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le nom d\'auteur doit faire au moins 2 caractères' })
  author?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Le titre doit faire au moins 2 caractères' })
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  genre?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'L\'année de début semble invalide' })
  @Max(new Date().getFullYear(), { message: 'L\'année de début ne peut pas être dans le futur' })
  yearFrom?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1000, { message: 'L\'année de fin semble invalide' })
  @Max(new Date().getFullYear(), { message: 'L\'année de fin ne peut pas être dans le futur' })
  yearTo?: number;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  maxResults?: number;
}
import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, MinLength, IsInt, IsOptional, Min, Max } from 'class-validator';

@InputType()
export class SearchBooksInput {
  @Field()
  @IsString()
  @MinLength(2, { message: 'La recherche doit faire au moins 2 caractères' })
  query!: string;

  @Field(() => Int, { nullable: true, defaultValue: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(40)
  maxResults?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  genre?: string;
}
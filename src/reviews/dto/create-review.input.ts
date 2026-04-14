import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsInt, IsOptional, Min, Max, MaxLength } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field()
  @IsString()
  bookId!: string;

  @Field(() => Int)
  @IsInt({ message: 'La note doit être un entier' })
  @Min(1, { message: 'La note minimum est 1' })
  @Max(5, { message: 'La note maximum est 5' })
  rating!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Le commentaire ne peut pas dépasser 2000 caractères' })
  comment?: string;
}
import { InputType, Field } from '@nestjs/graphql';
import { ReadingStatus } from '@prisma/client';
import { IsString, IsEnum } from 'class-validator';

@InputType()
export class UpdateCollectionStatusInput {
  @Field()
  @IsString()
  bookId!: string;

  @Field(() => ReadingStatus)
  @IsEnum(ReadingStatus, { message: 'Statut de lecture invalide' })
  status!: ReadingStatus;
}
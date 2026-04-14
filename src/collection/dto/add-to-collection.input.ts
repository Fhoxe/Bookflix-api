import { InputType, Field } from '@nestjs/graphql';
import { ReadingStatus } from '@prisma/client';
import { IsString, IsEnum, IsOptional } from 'class-validator';

@InputType()
export class AddToCollectionInput {
  @Field()
  @IsString()
  bookId!: string;

  @Field(() => ReadingStatus, { nullable: true, defaultValue: ReadingStatus.TO_READ })
  @IsOptional()
  @IsEnum(ReadingStatus)
  status?: ReadingStatus;
}
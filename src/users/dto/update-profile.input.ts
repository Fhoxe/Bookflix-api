import { InputType, Field } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'La bio ne peut pas dépasser 500 caractères' })
  bio?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'L\'avatar doit être une URL valide' })
  avatar?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
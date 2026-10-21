import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { FeedbackKind } from '@prisma/client';

export class CreateFeedbackDto {
  @IsIn(['evento', 'formacao'])
  kind!: FeedbackKind;

  @IsString()
  @MaxLength(60)
  targetId!: string;

  @IsObject()
  ratings!: Record<string, number>;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

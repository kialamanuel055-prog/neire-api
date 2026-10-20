import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { Modality, OpportunityType } from '@prisma/client';

export const OPPORTUNITY_TYPES = ['estagio', 'emprego', 'formacao', 'bolsa', 'concurso', 'voluntariado', 'mentoria'];
export const MODALITIES = ['presencial', 'remoto', 'hibrido'];

export class CreateOpportunityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsIn(OPPORTUNITY_TYPES)
  type!: OpportunityType;

  @IsString()
  @MaxLength(80)
  area!: string;

  @IsIn(MODALITIES)
  modality!: Modality;

  @IsString()
  @MaxLength(80)
  level!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  description!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  requirements!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  vacancies!: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deadline must be a date (YYYY-MM-DD)' })
  deadline!: string;
}

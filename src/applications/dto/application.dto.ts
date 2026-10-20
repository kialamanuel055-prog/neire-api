import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ApplicationStatus } from '@prisma/client';

export class ApplyDto {
  @IsString()
  opportunityId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  message?: string;
}

export class SetApplicationStatusDto {
  @IsIn(['enviada', 'em_analise', 'pre_selecionado', 'entrevista', 'selecionado', 'nao_selecionado'])
  status!: ApplicationStatus;
}

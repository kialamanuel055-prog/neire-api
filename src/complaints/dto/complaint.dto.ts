import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  category!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsBoolean()
  anonymous?: boolean;
}

export class SetComplaintStatusDto {
  @IsIn(['recebida', 'em_analise', 'resolvida'])
  status!: 'recebida' | 'em_analise' | 'resolvida';

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  response?: string;
}

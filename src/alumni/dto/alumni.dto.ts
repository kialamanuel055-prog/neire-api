import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class BecomeAlumniDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  graduationYear?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  position?: string;
}

export class UpdateAlumniDto extends BecomeAlumniDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsBoolean()
  offersMentoring?: boolean;
}

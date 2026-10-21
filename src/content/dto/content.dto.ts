import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  category!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(600)
  summary!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'date must start with YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class CreateStoryDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  personName!: string;

  @IsString()
  @MaxLength(160)
  role!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(6000)
  story!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}/, { message: 'date must start with YYYY-MM-DD' })
  date!: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class SetPublishedDto {
  @IsBoolean()
  published!: boolean;
}

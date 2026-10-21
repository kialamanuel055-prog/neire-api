import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  type!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  description?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be a date (YYYY-MM-DD)' })
  date!: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'time must be HH:mm' })
  time!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  location!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  capacity!: number;
}

export class SetRegistrationDto {
  @IsBoolean()
  registered!: boolean;
}

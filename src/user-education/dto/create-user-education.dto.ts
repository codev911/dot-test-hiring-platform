import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { EducationLevel } from '../../utils/enums/education-level.enum';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO for creating a new user education.
 */
export class CreateUserEducationDto {
  @ApiProperty({
    description: 'Name of the educational institution',
    example: 'Harvard University',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  institution!: string;

  @ApiProperty({
    description: 'Level of education',
    enum: EducationLevel,
    example: EducationLevel.BACHELOR_DEGREE,
  })
  @IsEnum(EducationLevel)
  educationLevel!: EducationLevel;

  @ApiProperty({
    description: 'Starting month of education',
    enum: Month,
    required: false,
    example: Month.SEPTEMBER,
  })
  @IsOptional()
  @IsEnum(Month)
  fromMonth?: Month;

  @ApiProperty({
    description: 'Starting year of education',
    example: 2018,
    minimum: 1950,
    maximum: 2030,
  })
  @IsPositive()
  @Min(1950)
  @Max(2030)
  fromYear!: number;

  @ApiProperty({
    description: 'Ending month of education',
    enum: Month,
    required: false,
    example: Month.MAY,
  })
  @IsOptional()
  @IsEnum(Month)
  toMonth?: Month;

  @ApiProperty({
    description: 'Ending year of education',
    example: 2022,
    minimum: 1950,
    maximum: 2030,
  })
  @IsPositive()
  @Min(1950)
  @Max(2030)
  toYear!: number;

  @ApiProperty({
    description: 'Additional description about the education',
    example: 'Computer Science major with focus on AI and Machine Learning',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

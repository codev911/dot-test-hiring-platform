import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { JobType } from '../../utils/enums/job-type.enum';
import { JobLocation } from '../../utils/enums/job-location.enum';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO for creating a new user experience.
 */
export class CreateUserExperienceDto {
  @ApiProperty({
    description: 'Job title',
    example: 'Senior Software Engineer',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({
    description: 'Company name',
    example: 'Tech Corp',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  company!: string;

  @ApiProperty({
    description: 'Job type',
    enum: JobType,
    example: JobType.FULL_TIME,
  })
  @IsEnum(JobType)
  type!: JobType;

  @ApiProperty({
    description: 'Job location type',
    enum: JobLocation,
    example: JobLocation.ONSITE,
  })
  @IsEnum(JobLocation)
  location!: JobLocation;

  @ApiProperty({
    description: 'Start month',
    enum: Month,
    example: Month.JANUARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(Month)
  fromMonth?: Month;

  @ApiProperty({
    description: 'Start year',
    example: 2020,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  fromYear?: number;

  @ApiProperty({
    description: 'End month',
    enum: Month,
    example: Month.DECEMBER,
    required: false,
  })
  @IsOptional()
  @IsEnum(Month)
  toMonth?: Month;

  @ApiProperty({
    description: 'End year',
    example: 2023,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  toYear?: number;

  @ApiProperty({
    description: 'Job description',
    example: 'Developed web applications using React and Node.js',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

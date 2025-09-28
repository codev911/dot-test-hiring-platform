import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsEnum, IsOptional, IsDecimal, IsBoolean } from 'class-validator';
import { JobType } from '../../utils/enums/job-type.enum';
import { JobLocation } from '../../utils/enums/job-location.enum';
import { FiatCurrency } from '../../utils/enums/fiat-currency.enum';

/**
 * Payload to create a new job posting.
 */
export class CreateJobPostingDto {
  @ApiProperty({ description: 'Job title', maxLength: 255, example: 'Senior Software Engineer' })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: 'Job description',
    example: 'We are looking for a senior engineer...',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: 'Employment type',
    enum: JobType,
    example: JobType.FULL_TIME,
  })
  @IsOptional()
  @IsEnum(JobType)
  employmentType?: JobType;

  @ApiPropertyOptional({
    description: 'Work location type',
    enum: JobLocation,
    example: JobLocation.REMOTE,
  })
  @IsOptional()
  @IsEnum(JobLocation)
  workLocationType?: JobLocation;

  @ApiPropertyOptional({ description: 'Minimum salary', example: '100000.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  salaryMin?: string;

  @ApiPropertyOptional({ description: 'Maximum salary', example: '150000.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  salaryMax?: string;

  @ApiPropertyOptional({
    description: 'Salary currency',
    enum: FiatCurrency,
    example: FiatCurrency.USD,
  })
  @IsOptional()
  @IsEnum(FiatCurrency)
  salaryCurrency?: FiatCurrency;

  @ApiPropertyOptional({ description: 'Whether job is published', default: false, example: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

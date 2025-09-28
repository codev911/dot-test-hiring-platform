import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsEnum, IsOptional, IsDecimal, IsBoolean } from 'class-validator';
import { JobType } from '../../utils/enums/job-type.enum';
import { JobLocation } from '../../utils/enums/job-location.enum';
import { FiatCurrency } from '../../utils/enums/fiat-currency.enum';

/**
 * Payload to update an existing job posting.
 */
export class UpdateJobPostingDto {
  @ApiPropertyOptional({
    description: 'Job title',
    maxLength: 255,
    example: 'Senior Software Engineer',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Job description',
    example: 'Updated description for the role',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Employment type',
    enum: JobType,
    example: JobType.CONTRACT,
  })
  @IsOptional()
  @IsEnum(JobType)
  employmentType?: JobType;

  @ApiPropertyOptional({
    description: 'Work location type',
    enum: JobLocation,
    example: JobLocation.HYBRID,
  })
  @IsOptional()
  @IsEnum(JobLocation)
  workLocationType?: JobLocation;

  @ApiPropertyOptional({ description: 'Minimum salary', example: '110000.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  salaryMin?: string;

  @ApiPropertyOptional({ description: 'Maximum salary', example: '160000.00' })
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

  @ApiPropertyOptional({ description: 'Whether job is published', example: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

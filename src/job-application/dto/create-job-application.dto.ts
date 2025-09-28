import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDecimal, IsEnum, IsDateString } from 'class-validator';
import { FiatCurrency } from '../../utils/enums/fiat-currency.enum';

/**
 * Payload to create a new job application.
 */
export class CreateJobApplicationDto {
  @ApiProperty({ description: 'Job posting ID', example: '123' })
  @IsString()
  jobId: string;

  @ApiPropertyOptional({ description: 'Resume ID to attach to application', example: '456' })
  @IsOptional()
  @IsString()
  resumeId?: string;

  @ApiPropertyOptional({ description: 'Cover letter content', example: 'I am excited to apply...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ description: 'Expected salary', example: '120000.00' })
  @IsOptional()
  @IsDecimal({ decimal_digits: '2' })
  expectedSalary?: string;

  @ApiPropertyOptional({
    description: 'Salary currency',
    enum: FiatCurrency,
    example: FiatCurrency.USD,
  })
  @IsOptional()
  @IsEnum(FiatCurrency)
  salaryCurrency?: FiatCurrency;

  @ApiPropertyOptional({ description: 'Available from date (YYYY-MM-DD)', example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  availableFrom?: string;
}

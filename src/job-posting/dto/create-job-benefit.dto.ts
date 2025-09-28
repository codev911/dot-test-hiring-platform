import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to create a new job benefit.
 */
export class CreateJobBenefitDto {
  @ApiProperty({ description: 'Benefit label', maxLength: 255, example: 'Health Insurance' })
  @IsString()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({
    description: 'Benefit description',
    example: 'Comprehensive health coverage',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to update an existing job benefit.
 */
export class UpdateJobBenefitDto {
  @ApiPropertyOptional({ description: 'Benefit label', maxLength: 255, example: 'Stock Options' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({
    description: 'Benefit description',
    example: 'Employee stock purchase plan',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

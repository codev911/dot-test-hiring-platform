import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to update an existing job requirement.
 */
export class UpdateJobRequirementDto {
  @ApiPropertyOptional({
    description: 'Requirement label',
    maxLength: 255,
    example: 'Master Degree',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({ description: 'Requirement detail', example: 'Information Technology' })
  @IsOptional()
  @IsString()
  detail?: string;
}

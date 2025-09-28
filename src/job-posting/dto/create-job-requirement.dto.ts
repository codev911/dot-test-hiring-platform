import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Payload to create a new job requirement.
 */
export class CreateJobRequirementDto {
  @ApiProperty({ description: 'Requirement label', maxLength: 255, example: 'Bachelor Degree' })
  @IsString()
  @MaxLength(255)
  label!: string;

  @ApiPropertyOptional({
    description: 'Requirement detail',
    example: 'Computer Science or related field',
  })
  @IsOptional()
  @IsString()
  detail?: string;
}

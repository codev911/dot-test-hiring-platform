import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Payload to update company information.
 */
export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Company website (URL)', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({ require_protocol: true }, { message: 'website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Path to company logo' })
  @IsOptional()
  @IsString()
  logoPath?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @IsString()
  description?: string;
}

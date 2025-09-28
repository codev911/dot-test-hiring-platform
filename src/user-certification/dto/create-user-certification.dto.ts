import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO for creating a new user certification.
 */
export class CreateUserCertificationDto {
  @ApiProperty({
    description: 'Name of the certification',
    example: 'AWS Certified Solutions Architect',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  certificationName!: string;

  @ApiProperty({
    description: 'Organization that issued the certification',
    example: 'Amazon Web Services',
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  issuingOrganization!: string;

  @ApiProperty({
    description: 'Month when certification was issued',
    enum: Month,
    example: Month.JANUARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(Month)
  issuedMonth?: Month;

  @ApiProperty({
    description: 'Year when certification was issued',
    example: 2023,
  })
  @IsNotEmpty()
  @IsPositive()
  issuedYear!: number;

  @ApiProperty({
    description: 'Month when certification expires',
    enum: Month,
    example: Month.JANUARY,
    required: false,
  })
  @IsOptional()
  @IsEnum(Month)
  expiredMonth?: Month;

  @ApiProperty({
    description: 'Year when certification expires',
    example: 2026,
    required: false,
  })
  @IsOptional()
  @IsPositive()
  expiredYear?: number;

  @ApiProperty({
    description: 'Certification ID or credential ID',
    example: 'AWS-SAA-C03-123456',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  certificationId?: string;

  @ApiProperty({
    description: 'URL to verify certification online',
    example: 'https://www.credly.com/badges/123456',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  certificationUrl?: string;
}

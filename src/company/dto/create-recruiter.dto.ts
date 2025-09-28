import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload to create a new recruiter (manager level) under company 1.
 */
export class CreateRecruiterDto {
  @ApiProperty({ description: 'Recruiter first name', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'Recruiter last name', maxLength: 255, required: false })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Recruiter email', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ description: 'Password (min length 6)' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ description: 'Password confirmation (must match password)' })
  @IsString()
  @MinLength(6)
  confirmPassword!: string;
}

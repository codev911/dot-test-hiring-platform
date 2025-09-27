import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({ example: 'Jane', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiProperty({ example: 'candidate@example.com', maxLength: 320 })
  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : undefined))
  email!: string;

  @ApiProperty({ example: 'Password123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password!: string;
}

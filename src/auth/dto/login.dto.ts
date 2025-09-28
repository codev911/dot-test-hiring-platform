import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload contract for login endpoints.
 */
export class LoginDto {
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

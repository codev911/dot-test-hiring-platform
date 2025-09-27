import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  firstName!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @IsEmail()
  @MaxLength(320)
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : undefined))
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  password!: string;
}

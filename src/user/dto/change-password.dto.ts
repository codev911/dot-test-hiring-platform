import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO describing the payload to change the authenticated user's password.
 */
export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  currentPassword!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  newPassword!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8, maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(255)
  confirmPassword!: string;
}

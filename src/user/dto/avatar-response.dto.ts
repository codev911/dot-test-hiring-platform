import { ApiProperty } from '@nestjs/swagger';

/**
 * Response payload containing the public avatar URL.
 */
export class AvatarResponseDto {
  @ApiProperty({
    example: 'http://localhost:9000/testhireplatform/profile/123.png',
    nullable: true,
  })
  avatarUrl: string | null = null;
}

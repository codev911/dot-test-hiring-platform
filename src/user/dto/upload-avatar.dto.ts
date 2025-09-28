import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO representing the multipart payload for avatar uploads.
 */
export class UploadAvatarDto {
  @ApiProperty({ type: 'string', format: 'binary', required: true })
  avatar!: string;
}

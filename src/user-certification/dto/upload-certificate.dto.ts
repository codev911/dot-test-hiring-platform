import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-only DTO describing the certificate upload payload.
 */
export class UploadCertificateDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'PDF certificate file up to 10MB.',
  })
  file!: unknown;
}

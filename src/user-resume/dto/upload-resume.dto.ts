import { ApiProperty } from '@nestjs/swagger';

/**
 * Swagger-only DTO describing the resume upload payload.
 */
export class UploadResumeDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'PDF file up to 10MB.' })
  resume!: unknown;
}

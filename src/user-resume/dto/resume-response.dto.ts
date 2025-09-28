import { ApiProperty } from '@nestjs/swagger';

/**
 * Payload returned containing the public URL for the resume.
 */
export class ResumePayloadDto {
  @ApiProperty({ example: 'http://localhost:9000/bucket/resume/user-1.pdf', nullable: true })
  resumeUrl!: string | null;
}

/**
 * Response DTO for resume operations.
 */
export class ResumeResponseDto {
  @ApiProperty({ example: 'Resume uploaded successfully.' })
  message!: string;

  @ApiProperty({ type: ResumePayloadDto })
  data!: ResumePayloadDto;
}

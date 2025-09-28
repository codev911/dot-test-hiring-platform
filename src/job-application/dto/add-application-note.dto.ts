import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Payload to add a note to a job application (recruiter only).
 */
export class AddApplicationNoteDto {
  @ApiProperty({ description: 'Note content', example: 'Candidate has strong portfolio.' })
  @IsString()
  note: string;
}

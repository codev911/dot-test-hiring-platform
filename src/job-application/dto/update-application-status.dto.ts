import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApplicationStatus } from '../../utils/enums/application-status.enum';

/**
 * Payload to update job application status (recruiter only).
 */
export class UpdateApplicationStatusDto {
  @ApiProperty({
    description: 'New application status',
    enum: ApplicationStatus,
    example: ApplicationStatus.INTERVIEW,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiPropertyOptional({
    description: 'Optional note about the status change',
    example: 'Proceed to first interview',
  })
  @IsOptional()
  @IsString()
  note?: string;
}

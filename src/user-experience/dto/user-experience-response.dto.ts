import { ApiProperty } from '@nestjs/swagger';
import { JobType } from '../../utils/enums/job-type.enum';
import { JobLocation } from '../../utils/enums/job-location.enum';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO representing a single user experience in API responses.
 */
export class UserExperienceDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  title!: string;

  @ApiProperty({ example: 'Tech Corp' })
  company!: string;

  @ApiProperty({ enum: JobType, example: JobType.FULL_TIME })
  type!: JobType;

  @ApiProperty({ enum: JobLocation, example: JobLocation.ONSITE })
  location!: JobLocation;

  @ApiProperty({ enum: Month, example: Month.JANUARY, required: false })
  fromMonth?: Month;

  @ApiProperty({ example: 2020, required: false })
  fromYear?: number;

  @ApiProperty({ enum: Month, example: Month.DECEMBER, required: false })
  toMonth?: Month;

  @ApiProperty({ example: 2023, required: false })
  toYear?: number;

  @ApiProperty({ example: 'Developed web applications using React and Node.js', required: false })
  description?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2023-01-02T00:00:00.000Z' })
  updatedAt?: Date;
}

/**
 * Pagination metadata for user experiences list.
 */
export class UserExperiencesPaginationDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 25 })
  totalData!: number;

  @ApiProperty({ example: 3 })
  totalPage!: number;
}

/**
 * Response DTO for paginated user experiences list.
 */
export class UserExperiencesListResponseDto {
  @ApiProperty({ example: 'User experiences retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: [UserExperienceDto] })
  data!: UserExperienceDto[];

  @ApiProperty({ type: UserExperiencesPaginationDto })
  pagination!: UserExperiencesPaginationDto;
}

/**
 * Response DTO for single user experience operations.
 */
export class UserExperienceResponseDto {
  @ApiProperty({ example: 'User experience created successfully.' })
  message!: string;

  @ApiProperty({ type: UserExperienceDto })
  data!: UserExperienceDto;
}

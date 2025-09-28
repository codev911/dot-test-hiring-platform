import { ApiProperty } from '@nestjs/swagger';
import { EducationLevel } from '../../utils/enums/education-level.enum';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO representing a single user education in API responses.
 */
export class UserEducationDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Harvard University' })
  institution!: string;

  @ApiProperty({ enum: EducationLevel, example: EducationLevel.BACHELOR_DEGREE })
  educationLevel!: EducationLevel;

  @ApiProperty({ enum: Month, example: Month.SEPTEMBER, required: false })
  fromMonth?: Month;

  @ApiProperty({ example: 2018 })
  fromYear!: number;

  @ApiProperty({ enum: Month, example: Month.MAY, required: false })
  toMonth?: Month;

  @ApiProperty({ example: 2022 })
  toYear!: number;

  @ApiProperty({
    example: 'Computer Science major with focus on AI and Machine Learning',
    required: false,
  })
  description?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2023-01-02T00:00:00.000Z' })
  updatedAt?: Date;
}

/**
 * Pagination metadata for user educations list.
 */
export class UserEducationsPaginationDto {
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
 * Response DTO for paginated user educations list.
 */
export class UserEducationsListResponseDto {
  @ApiProperty({ example: 'User educations retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: [UserEducationDto] })
  data!: UserEducationDto[];

  @ApiProperty({ type: UserEducationsPaginationDto })
  pagination!: UserEducationsPaginationDto;
}

/**
 * Response DTO for single user education operations.
 */
export class UserEducationResponseDto {
  @ApiProperty({ example: 'User education created successfully.' })
  message!: string;

  @ApiProperty({ type: UserEducationDto })
  data!: UserEducationDto;
}

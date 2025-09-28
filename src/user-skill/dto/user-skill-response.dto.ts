import { ApiProperty } from '@nestjs/swagger';
import { SkillProficiency } from '../../utils/enums/skill-proficiency.enum';

/**
 * DTO representing a single user skill in API responses.
 */
export class UserSkillDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'JavaScript' })
  skillName!: string;

  @ApiProperty({ enum: SkillProficiency, example: SkillProficiency.INTERMEDIATE })
  proficiency!: SkillProficiency;

  @ApiProperty({ example: 3, required: false })
  yearsExperience?: number;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2023-01-02T00:00:00.000Z' })
  updatedAt?: Date;
}

/**
 * Pagination metadata for user skills list.
 */
export class UserSkillsPaginationDto {
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
 * Response DTO for paginated user skills list.
 */
export class UserSkillsListResponseDto {
  @ApiProperty({ example: 'User skills retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: [UserSkillDto] })
  data!: UserSkillDto[];

  @ApiProperty({ type: UserSkillsPaginationDto })
  pagination!: UserSkillsPaginationDto;
}

/**
 * Response DTO for single user skill operations.
 */
export class UserSkillResponseDto {
  @ApiProperty({ example: 'User skill created successfully.' })
  message!: string;

  @ApiProperty({ type: UserSkillDto })
  data!: UserSkillDto;
}

import { ApiProperty } from '@nestjs/swagger';
import type { JobBenefitData, JobRequirementData, JobSkillData } from '../../utils/types/job.type';

/**
 * Swagger response dto for a single job benefit.
 */
export class JobBenefitResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      jobId: '10',
      label: 'Health Insurance',
      description: 'Comprehensive health coverage',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: JobBenefitData;
}

/**
 * Swagger response dto for list of job benefits.
 */
export class JobBenefitsResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: [
      {
        id: '1',
        jobId: '10',
        label: 'Health Insurance',
        description: 'Comprehensive health coverage',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
  })
  data!: JobBenefitData[];
}

/**
 * Swagger response dto for a single job requirement.
 */
export class JobRequirementResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      jobId: '10',
      label: 'Bachelor Degree',
      detail: 'In Computer Science or related field',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: JobRequirementData;
}

/**
 * Swagger response dto for list of job requirements.
 */
export class JobRequirementsResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: [
      {
        id: '1',
        jobId: '10',
        label: 'Bachelor Degree',
        detail: 'In Computer Science or related field',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
  })
  data!: JobRequirementData[];
}

/**
 * Swagger response dto for a single job skill.
 */
export class JobSkillResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      jobId: '10',
      skillName: 'TypeScript',
      priority: 'core',
      proficiency: 'advanced',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: JobSkillData;
}

/**
 * Swagger response dto for list of job skills.
 */
export class JobSkillsResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: [
      {
        id: '1',
        jobId: '10',
        skillName: 'TypeScript',
        priority: 'core',
        proficiency: 'advanced',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
    ],
  })
  data!: JobSkillData[];
}

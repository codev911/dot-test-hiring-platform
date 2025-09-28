import { ApiProperty } from '@nestjs/swagger';
import type {
  JobPostingData,
  JobPostingWithCompanyData,
  PaginatedJobPostingsData,
} from '../../utils/types/job.type';

/**
 * Swagger response dto for job posting data.
 */
export class JobPostingResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      companyId: '1',
      recruiterId: '1',
      title: 'Senior Software Engineer',
      slug: 'senior-software-engineer-1',
      description: 'We are looking for a senior software engineer...',
      employmentType: 'full_time',
      workLocationType: 'remote',
      salaryMin: '100000.00',
      salaryMax: '150000.00',
      salaryCurrency: 'USD',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: JobPostingData;
}

/**
 * Swagger response dto for job posting with company details.
 */
export class JobPostingWithCompanyResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      companyId: '1',
      recruiterId: '1',
      title: 'Senior Software Engineer',
      slug: 'senior-software-engineer-1',
      description: 'We are looking for a senior software engineer...',
      employmentType: 'full_time',
      workLocationType: 'remote',
      salaryMin: '100000.00',
      salaryMax: '150000.00',
      salaryCurrency: 'USD',
      isPublished: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      company: {
        id: '1',
        name: 'Awesome Corp',
        description: 'We build awesome things.',
      },
      benefits: [],
      requirements: [],
      skills: [],
    },
  })
  data!: JobPostingWithCompanyData;
}

/**
 * Swagger response dto for paginated job postings.
 */
export class PaginatedJobPostingsResponseDto {
  @ApiProperty({ example: 200 })
  statusCode!: number;

  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: [
      {
        id: '1',
        companyId: '1',
        recruiterId: '1',
        title: 'Senior Software Engineer',
        slug: 'senior-software-engineer-1',
        description: 'We are looking for a senior software engineer...',
        employmentType: 'full_time',
        workLocationType: 'remote',
        salaryMin: '100000.00',
        salaryMax: '150000.00',
        salaryCurrency: 'USD',
        isPublished: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        company: { id: '1', name: 'Awesome Corp', description: 'We build awesome things.' },
        benefits: [],
        requirements: [],
        skills: [],
      },
    ],
  })
  data!: PaginatedJobPostingsData['data'];

  @ApiProperty({
    example: { page: 1, limit: 10, totalData: 1, totalPage: 1 },
  })
  pagination!: { page: number; limit: number; totalData: number; totalPage: number };
}

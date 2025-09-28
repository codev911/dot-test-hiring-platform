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
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      data: [
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
          benefits: [
            {
              id: 'b1',
              jobId: '1',
              label: 'Health Insurance',
              description: 'Comprehensive health coverage',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          requirements: [
            {
              id: 'r1',
              jobId: '1',
              label: 'Bachelor Degree',
              detail: 'Computer Science or related field',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
          skills: [
            {
              id: 's1',
              jobId: '1',
              skillName: 'TypeScript',
              priority: 'core',
              proficiency: 'advanced',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        },
      ],
      totalData: 1,
      page: 1,
      limit: 10,
      totalPage: 1,
    },
  })
  data!: PaginatedJobPostingsData;
}

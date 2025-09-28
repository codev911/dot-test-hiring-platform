import { ApiProperty } from '@nestjs/swagger';
import type {
  JobApplicationData,
  JobApplicationWithRelationsData,
  PaginatedJobApplicationsData,
  JobApplicationEventData,
  JobApplicationNoteData,
} from '../../utils/types/job.type';

/**
 * Swagger response dto for job application data.
 */
export class JobApplicationResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      jobId: '1',
      candidateId: '1',
      resumeId: '1',
      coverLetter: 'I am very interested in this position...',
      status: 'applied',
      expectedSalary: '80000.00',
      salaryCurrency: 'USD',
      availableFrom: '2024-02-01',
      submittedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: JobApplicationData;
}

/**
 * Swagger response dto for job application with relations.
 */
export class JobApplicationWithRelationsResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      jobId: '1',
      candidateId: '1',
      resumeId: '1',
      coverLetter: 'I am very interested in this position...',
      status: 'applied',
      expectedSalary: '80000.00',
      salaryCurrency: 'USD',
      availableFrom: '2024-02-01',
      submittedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      job: {
        id: '1',
        title: 'Senior Software Engineer',
        companyName: 'Awesome Corp',
      },
      candidate: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      },
      resume: {
        id: '1',
        resumeUrl: '/resumes/john-doe-resume.pdf',
      },
    },
  })
  data!: JobApplicationWithRelationsData;
}

/**
 * Swagger response dto for paginated job applications.
 */
export class PaginatedJobApplicationsResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      data: [
        {
          id: '1',
          jobId: '1',
          candidateId: '1',
          resumeId: '1',
          coverLetter: 'I am very interested in this position...',
          status: 'applied',
          expectedSalary: '80000.00',
          salaryCurrency: 'USD',
          availableFrom: '2024-02-01',
          submittedAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          job: {
            id: '1',
            title: 'Senior Software Engineer',
            companyName: 'Awesome Corp',
          },
          candidate: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
          },
          resume: {
            id: '1',
            resumeUrl: '/resumes/john-doe-resume.pdf',
          },
        },
      ],
      totalData: 1,
      page: 1,
      limit: 10,
      totalPage: 1,
    },
  })
  data!: PaginatedJobApplicationsData;
}

/**
 * Swagger response dto for job application event.
 */
export class JobApplicationEventResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      applicationId: '1',
      status: 'under review',
      note: 'Application under review by hiring manager',
      occurredAt: '2024-01-02T00:00:00.000Z',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: JobApplicationEventData;
}

/**
 * Swagger response dto for job application note.
 */
export class JobApplicationNoteResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      applicationId: '1',
      authorRecruiterId: '1',
      note: 'Strong technical background, good fit for the role.',
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      author: {
        id: '1',
        firstName: 'Jane',
        lastName: 'Smith',
      },
    },
  })
  data!: JobApplicationNoteData;
}

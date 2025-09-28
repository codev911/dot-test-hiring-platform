import { ApiProperty } from '@nestjs/swagger';
import type { CompanyData, RecruiterCreationData } from '../../utils/types/company.type';

/**
 * Swagger response dto for company info.
 */
export class CompanyResponseDto {
  @ApiProperty({ example: 'Operation successful.' })
  message!: string;

  @ApiProperty({
    example: {
      id: '1',
      name: 'Awesome Corp',
      website: 'https://awesome.example.com',
      logoPath: '/logos/awesome.png',
      description: 'We build awesome things.',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  })
  data!: CompanyData;
}

/**
 * Swagger response dto for recruiter creation.
 */
export class RecruiterCreationResponseDto {
  @ApiProperty({ example: 'Recruiter created successfully.' })
  message!: string;

  @ApiProperty({
    example: {
      userId: '23',
      companyRecruiterId: '45',
      email: 'recruiter.manager@example.com',
      recuiterLevel: 'manager',
      companyId: '1',
    },
  })
  data!: RecruiterCreationData;
}

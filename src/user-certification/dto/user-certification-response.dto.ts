import { ApiProperty } from '@nestjs/swagger';
import { Month } from '../../utils/enums/month.enum';

/**
 * DTO representing a single user certification in API responses.
 */
export class UserCertificationDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'AWS Certified Solutions Architect' })
  certificationName!: string;

  @ApiProperty({ example: 'Amazon Web Services' })
  issuingOrganization!: string;

  @ApiProperty({ enum: Month, example: Month.JANUARY, required: false })
  issuedMonth?: Month;

  @ApiProperty({ example: 2023 })
  issuedYear!: number;

  @ApiProperty({ enum: Month, example: Month.JANUARY, required: false })
  expiredMonth?: Month;

  @ApiProperty({ example: 2026, required: false })
  expiredYear?: number;

  @ApiProperty({ example: 'AWS-SAA-C03-123456', required: false })
  certificationId?: string;

  @ApiProperty({ example: 'https://www.credly.com/badges/123456', required: false })
  certificationUrl?: string;

  @ApiProperty({
    example: 'http://localhost:9000/bucket/certificate/user-1/aws-cert.pdf',
    nullable: true,
    required: false,
  })
  certificateUrl?: string | null;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  createdAt?: Date;

  @ApiProperty({ example: '2023-01-02T00:00:00.000Z' })
  updatedAt?: Date;
}

/**
 * Pagination metadata for user certifications list.
 */
export class UserCertificationsPaginationDto {
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
 * Response DTO for paginated user certifications list.
 */
export class UserCertificationsListResponseDto {
  @ApiProperty({ example: 'User certifications retrieved successfully.' })
  message!: string;

  @ApiProperty({ type: [UserCertificationDto] })
  data!: UserCertificationDto[];

  @ApiProperty({ type: UserCertificationsPaginationDto })
  pagination!: UserCertificationsPaginationDto;
}

/**
 * Response DTO for single user certification operations.
 */
export class UserCertificationResponseDto {
  @ApiProperty({ example: 'User certification created successfully.' })
  message!: string;

  @ApiProperty({ type: UserCertificationDto })
  data!: UserCertificationDto;
}

/**
 * Payload returned containing the certificate URL.
 */
export class CertificateUploadPayloadDto {
  @ApiProperty({
    example: 'http://localhost:9000/bucket/certificate/user-1/aws-cert.pdf',
    nullable: true,
  })
  certificateUrl!: string | null;
}

/**
 * Response DTO for certificate upload operations.
 */
export class CertificateUploadResponseDto {
  @ApiProperty({ example: 'Certificate uploaded or replaced successfully.' })
  message!: string;

  @ApiProperty({ type: CertificateUploadPayloadDto })
  data!: CertificateUploadPayloadDto;
}

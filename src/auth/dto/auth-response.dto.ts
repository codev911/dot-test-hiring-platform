import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecuiterLevel } from '../../utils/enums/recuiter-level.enum';

export class AuthenticatedUserDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Jane' })
  firstName!: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;
}

export class RecruiterMetadataDto {
  @ApiProperty({ example: '10' })
  companyId!: string;

  @ApiProperty({ enum: RecuiterLevel, example: RecuiterLevel.OWNER })
  recuiterLevel!: RecuiterLevel;
}

export class AuthTokenPayloadDto {
  @ApiProperty({ example: 'jwt-token' })
  accessToken!: string;

  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;

  @ApiProperty({ enum: ['candidate', 'recruiter'], example: 'candidate' })
  role!: 'candidate' | 'recruiter';

  @ApiPropertyOptional({ type: RecruiterMetadataDto })
  recruiter?: RecruiterMetadataDto;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'Login successful.' })
  message!: string;

  @ApiProperty({ type: AuthTokenPayloadDto })
  data!: AuthTokenPayloadDto;
}

export class AuthProfilePayloadDto {
  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;

  @ApiProperty({ enum: ['candidate', 'recruiter'], example: 'candidate' })
  role!: 'candidate' | 'recruiter';

  @ApiPropertyOptional({ type: RecruiterMetadataDto })
  recruiter?: RecruiterMetadataDto;
}

export class AuthProfileResponseDto {
  @ApiProperty({ example: 'Profile retrieved.' })
  message!: string;

  @ApiProperty({ type: AuthProfilePayloadDto })
  data!: AuthProfilePayloadDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { UserWebsite } from '../../utils/enums/user-website.enum';

/**
 * Data Transfer Object for user site response data.
 */
export class UserSiteResponseDto {
  /**
   * Unique identifier of the user site.
   */
  @ApiProperty({
    description: 'Unique identifier of the user site',
    example: '1',
  })
  id: string;

  /**
   * The type/platform of the site.
   */
  @ApiProperty({
    description: 'The type/platform of the site',
    enum: UserWebsite,
    example: UserWebsite.PORTOFOLIO,
  })
  siteType: UserWebsite;

  /**
   * The URL of the user's site.
   */
  @ApiProperty({
    description: 'The URL of the user site',
    example: 'https://johndoe-portfolio.com',
  })
  url: string;

  /**
   * The date and time when the site was created.
   */
  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T08:30:00.000Z',
  })
  createdAt?: Date;

  /**
   * The date and time when the site was last updated.
   */
  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T08:30:00.000Z',
  })
  updatedAt?: Date;
}

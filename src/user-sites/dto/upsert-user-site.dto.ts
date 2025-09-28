import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { UserWebsite } from '../../utils/enums/user-website.enum';

/**
 * Data Transfer Object for upserting user sites.
 * Supports both creating new sites and updating existing ones based on user_id + site_type.
 */
export class UpsertUserSiteDto {
  /**
   * The type/platform of the site (LinkedIn, GitHub, Portfolio Website).
   * Used with user_id to determine if this is create or update operation.
   *
   * @example UserWebsite.LINKEDIN
   */
  @ApiProperty({
    description: 'The type/platform of the site',
    enum: UserWebsite,
    example: UserWebsite.PORTOFOLIO,
  })
  @IsNotEmpty()
  @IsEnum(UserWebsite)
  siteType: UserWebsite;

  /**
   * The URL of the user's site.
   * Must be a valid URL format.
   *
   * @example "https://www.example.com"
   */
  @ApiProperty({
    description: 'The URL of the user site',
    example: 'https://johndoe-portfolio.com',
  })
  @IsNotEmpty()
  @IsString()
  @IsUrl(undefined, { message: 'URL must be a valid URL format' })
  url: string;
}

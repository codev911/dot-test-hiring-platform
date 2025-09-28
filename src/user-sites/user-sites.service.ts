import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserSites } from '../entities/user-sites.entity';
import { User } from '../entities/user.entity';
import { UserWebsite } from '../utils/enums/user-website.enum';
import { UpsertUserSiteDto } from './dto/upsert-user-site.dto';
import type { UserSiteData } from '../utils/types/user.type';

/**
 * Application service that encapsulates user site management tasks.
 * Each user can have one site per type (e.g., one Portfolio, one LinkedIn, etc.).
 */
@Injectable()
export class UserSitesService {
  /**
   * Construct the service with persistence dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userSitesRepository TypeORM repository managing {@link UserSites} entities.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSites)
    private readonly userSitesRepository: Repository<UserSites>,
  ) {}

  /**
   * Upsert a user site (create new or update existing).
   * Each user can only have one site per type, so this method will
   * create if it doesn't exist or update if it does.
   *
   * @param userId Identifier of the user.
   * @param upsertUserSiteDto Data for upserting the site.
   * @returns The upserted user site.
   * @throws NotFoundException When the user cannot be located.
   */
  async upsert(userId: string, upsertUserSiteDto: UpsertUserSiteDto): Promise<UserSiteData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // Check if user already has a site of this type
    const existingSite = await this.userSitesRepository.findOne({
      where: { userId, siteType: upsertUserSiteDto.siteType },
    });

    let userSite: UserSites;

    if (existingSite) {
      // Update existing site
      existingSite.url = upsertUserSiteDto.url;
      userSite = await this.userSitesRepository.save(existingSite);
    } else {
      // Create new site
      const newSite = this.userSitesRepository.create({
        userId,
        siteType: upsertUserSiteDto.siteType,
        url: upsertUserSiteDto.url,
      });
      userSite = await this.userSitesRepository.save(newSite);
    }

    return this.mapToUserSiteData(userSite);
  }

  /**
   * Retrieve all sites for a user.
   *
   * @param userId Identifier of the user.
   * @returns Array of user sites.
   */
  async findAll(userId: string): Promise<UserSiteData[]> {
    const sites = await this.userSitesRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return sites.map((site) => this.mapToUserSiteData(site));
  }

  /**
   * Retrieve a specific site by type for a user.
   *
   * @param userId Identifier of the user.
   * @param siteType Type of the site to retrieve.
   * @returns The user site data.
   * @throws NotFoundException When the site cannot be located or doesn't belong to the user.
   */
  async findBySiteType(userId: string, siteType: UserWebsite): Promise<UserSiteData> {
    const site = await this.userSitesRepository.findOne({
      where: { userId, siteType },
    });

    if (!site) {
      throw new NotFoundException('User site not found.');
    }

    return this.mapToUserSiteData(site);
  }

  /**
   * Remove a user site by site type.
   *
   * @param userId Identifier of the user.
   * @param siteType Type of the site to remove.
   * @throws NotFoundException When the site cannot be located or doesn't belong to the user.
   */
  async remove(userId: string, siteType: UserWebsite): Promise<void> {
    const site = await this.userSitesRepository.findOne({
      where: { userId, siteType },
    });

    if (!site) {
      throw new NotFoundException('User site not found.');
    }

    await this.userSitesRepository.remove(site);
  }

  /**
   * Map UserSites entity to UserSiteData type.
   *
   * @param userSite UserSites entity to map.
   * @returns Mapped UserSiteData.
   */
  private mapToUserSiteData(userSite: UserSites): UserSiteData {
    return {
      id: userSite.id,
      siteType: userSite.siteType,
      url: userSite.url,
      createdAt: userSite.createdAt,
      updatedAt: userSite.updatedAt,
    };
  }
}

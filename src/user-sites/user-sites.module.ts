import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSitesController } from './user-sites.controller';
import { UserSitesService } from './user-sites.service';
import { UserSites } from '../entities/user-sites.entity';
import { User } from '../entities/user.entity';

/**
 * Module that encapsulates user sites functionality.
 * Provides endpoints for managing user sites with upsert and delete operations.
 * Each user can have one site per type (LinkedIn, GitHub, Portfolio, etc.).
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserSites, User])],
  controllers: [UserSitesController],
  providers: [UserSitesService],
  exports: [UserSitesService],
})
export class UserSitesModule {}

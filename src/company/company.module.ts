import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';

/**
 * Module wiring company endpoints and dependencies.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Company, User, CompanyRecruiter])],
  controllers: [CompanyController],
  providers: [CompanyService],
  exports: [CompanyService],
})
export class CompanyModule {}

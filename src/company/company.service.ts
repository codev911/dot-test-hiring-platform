import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { CompanyRecruiter } from '../entities/company-recruiter.entity';
import type { CompanyData, RecruiterCreationData } from '../utils/types/company.type';
import type { UpdateCompanyDto } from './dto/update-company.dto';
import type { CreateRecruiterDto } from './dto/create-recruiter.dto';
import { RecuiterLevel } from '../utils/enums/recuiter-level.enum';
import { withTransaction } from '../utils/database/transaction.util';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';

/**
 * Business logic for company operations.
 */
@Injectable()
export class CompanyService {
  /**
   * @param companyRepository Repository handling {@link Company} persistence.
   * @param userRepository Repository handling {@link User} persistence.
   * @param companyRecruiterRepository Repository for {@link CompanyRecruiter} entities.
   */
  constructor(
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CompanyRecruiter)
    private readonly companyRecruiterRepository: Repository<CompanyRecruiter>,
    private readonly cache: CacheHelperService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Get the statically configured company (ID 1).
   *
   * @returns Company projection for clients.
   * @throws NotFoundException When the company record is missing.
   */
  async getStaticCompany(): Promise<CompanyData> {
    const key = buildCacheKey('company', 'static');
    return this.cache.getOrSet<CompanyData>(
      key,
      async () => {
        const company = await this.companyRepository.findOne({ where: { id: '1' } });
        if (!company) {
          throw new NotFoundException('Company not found.');
        }
        return this.toCompanyData(company);
      },
      0, // no-expiry; explicit 0 overrides global default TTL
    );
  }

  /**
   * Update fields of the static company (ID 1).
   *
   * @param dto Update payload.
   * @returns Updated company projection.
   * @throws NotFoundException When the company record is missing.
   */
  async updateStaticCompany(dto: UpdateCompanyDto): Promise<CompanyData> {
    const company = await this.companyRepository.findOne({ where: { id: '1' } });
    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    if (dto.name !== undefined) company.name = dto.name;
    if (dto.website !== undefined) company.website = dto.website;
    if (dto.logoPath !== undefined) company.logoPath = dto.logoPath;
    if (dto.description !== undefined) company.description = dto.description;

    const saved = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(Company) : this.companyRepository;
      return repo.save(company);
    });

    // invalidate cached public company data (service-level and HTTP-level)
    await this.cache.del(buildCacheKey('company', 'static'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/company'));

    return this.toCompanyData(saved);
  }

  /**
   * Create a new recruiter under the static company (ID 1) with manager level.
   *
   * @param dto Recruiter creation payload.
   * @returns Creation metadata for the recruiter mapping and user.
   * @throws NotFoundException When the company record is missing.
   * @throws ConflictException When email already exists.
   */
  async createRecruiter(dto: CreateRecruiterDto): Promise<RecruiterCreationData> {
    const company = await this.companyRepository.findOne({ where: { id: '1' } });
    if (!company) {
      throw new NotFoundException('Company not found.');
    }

    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email is already registered.');
    }
    if (dto.password !== dto.confirmPassword) {
      throw new ConflictException('Password confirmation does not match.');
    }

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      password: dto.password,
    });
    const { savedUser, savedMapping } = await withTransaction(
      this.dataSource,
      async (em?: EntityManager) => {
        const userRepo = em ? em.getRepository(User) : this.userRepository;
        const mapRepo = em ? em.getRepository(CompanyRecruiter) : this.companyRecruiterRepository;
        const u = await userRepo.save(user);
        const mapping = mapRepo.create({
          companyId: company.id,
          recruiterId: u.id,
          recuiterLevel: RecuiterLevel.MANAGER,
          is_active: true,
        });
        const m = await mapRepo.save(mapping);
        return { savedUser: u, savedMapping: m };
      },
    );

    // optional: invalidate company cache in case public info reflects recruiter counts in future
    await this.cache.del(buildCacheKey('company', 'static'));
    await this.cache.del(buildHttpCacheKeyForUserPath(undefined, '/company'));

    return {
      userId: savedUser.id,
      companyRecruiterId: savedMapping.id,
      email: savedUser.email,
      recuiterLevel: savedMapping.recuiterLevel,
      companyId: company.id,
    };
  }

  /**
   * Map entity to public company projection.
   *
   * @param entity Company entity.
   * @returns CompanyData projection.
   */
  private toCompanyData(entity: Company): CompanyData {
    return {
      id: entity.id,
      name: entity.name,
      website: entity.website ?? undefined,
      logoPath: entity.logoPath ?? undefined,
      description: entity.description ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

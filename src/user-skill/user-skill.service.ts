import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import { UserSkill } from '../entities/user-skill.entity';
import { User } from '../entities/user.entity';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';
import { withTransaction } from '../utils/database/transaction.util';
import type { PaginatedUserSkillsData, UserSkillData } from '../utils/types/user.type';
import { CreateUserSkillDto } from './dto/create-user-skill.dto';
import { UpdateUserSkillDto } from './dto/update-user-skill.dto';

/**
 * Application service that encapsulates user skill management tasks.
 */
@Injectable()
export class UserSkillService {
  /**
   * Construct the service with persistence dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userSkillRepository TypeORM repository managing {@link UserSkill} entities.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSkill)
    private readonly userSkillRepository: Repository<UserSkill>,
    private readonly cache: CacheHelperService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new user skill.
   *
   * @param userId Identifier of the user.
   * @param createUserSkillDto Data for creating the skill.
   * @returns The created user skill.
   * @throws NotFoundException When the user cannot be located.
   */
  async create(userId: string, createUserSkillDto: CreateUserSkillDto): Promise<UserSkillData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userSkill = this.userSkillRepository.create({
      userId,
      ...createUserSkillDto,
    });

    const savedSkill = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserSkill) : this.userSkillRepository;
      return repo.save(userSkill);
    });
    await this.cache.invalidateIndex(buildCacheKey('idx', 'user', 'skill', 'list', userId));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'user', 'skill', 'list', userId));
    // Also clear the base HTTP key (no query params), which might have been cached prior to index tracking
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, '/user/skill'));
    return this.mapToUserSkillData(savedSkill);
  }

  /**
   * Retrieve paginated list of user skills.
   *
   * @param userId Identifier of the user.
   * @param page Page number (1-based).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated user skills data.
   */
  async findAll(userId: string, page = 1, limit = 10): Promise<PaginatedUserSkillsData> {
    const key = buildCacheKey('user', 'skill', 'list', userId, page, limit);
    const indexKey = buildCacheKey('idx', 'user', 'skill', 'list', userId);
    const httpIndexKey = buildCacheKey('idx', 'http', 'user', 'skill', 'list', userId);
    const httpKey = buildHttpCacheKeyForUserPath(userId, '/user/skill', { page, limit });
    const result = await this.cache.rememberList(
      indexKey,
      key,
      async () => {
        const [skills, total] = await this.userSkillRepository.findAndCount({
          where: { userId },
          order: { createdAt: 'DESC' },
          skip: (page - 1) * limit,
          take: limit,
        });

        const totalPage = Math.ceil(total / limit);

        return {
          data: skills.map((skill) => this.mapToUserSkillData(skill)),
          totalData: total,
          page,
          limit,
          totalPage,
        };
      },
      300_000,
    );
    await this.cache.trackKey(httpIndexKey, httpKey);
    return result;
  }

  /**
   * Retrieve a single user skill by ID.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the skill.
   * @returns The user skill data.
   * @throws NotFoundException When the skill cannot be located or doesn't belong to the user.
   */
  async findOne(userId: string, id: string): Promise<UserSkillData> {
    const key = buildCacheKey('user', 'skill', 'detail', userId, id);
    return this.cache.getOrSet(
      key,
      async () => {
        const skill = await this.userSkillRepository.findOne({
          where: { id, userId },
        });

        if (!skill) {
          throw new NotFoundException('User skill not found.');
        }

        return this.mapToUserSkillData(skill);
      },
      300_000,
    );
  }

  /**
   * Update a user skill.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the skill to update.
   * @param updateUserSkillDto Data for updating the skill.
   * @returns The updated user skill.
   * @throws NotFoundException When the skill cannot be located or doesn't belong to the user.
   */
  async update(
    userId: string,
    id: string,
    updateUserSkillDto: UpdateUserSkillDto,
  ): Promise<UserSkillData> {
    const skill = await this.userSkillRepository.findOne({
      where: { id, userId },
    });

    if (!skill) {
      throw new NotFoundException('User skill not found.');
    }

    Object.assign(skill, updateUserSkillDto);
    const updatedSkill = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserSkill) : this.userSkillRepository;
      return repo.save(skill);
    });

    await this.cache.del(buildCacheKey('user', 'skill', 'detail', userId, id));
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, `/user/skill/${id}`));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'user', 'skill', 'list', userId));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'user', 'skill', 'list', userId));
    // Also clear the base HTTP key (no query params)
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, '/user/skill'));

    return this.mapToUserSkillData(updatedSkill);
  }

  /**
   * Remove a user skill.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the skill to remove.
   * @throws NotFoundException When the skill cannot be located or doesn't belong to the user.
   */
  async remove(userId: string, id: string): Promise<void> {
    const skill = await this.userSkillRepository.findOne({
      where: { id, userId },
    });

    if (!skill) {
      throw new NotFoundException('User skill not found.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserSkill) : this.userSkillRepository;
      await repo.remove(skill);
      return undefined;
    });

    await this.cache.del(buildCacheKey('user', 'skill', 'detail', userId, id));
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, `/user/skill/${id}`));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'user', 'skill', 'list', userId));
    await this.cache.invalidateIndex(buildCacheKey('idx', 'http', 'user', 'skill', 'list', userId));
    // Also clear the base HTTP key (no query params)
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, '/user/skill'));
  }

  /**
   * Map UserSkill entity to UserSkillData type.
   *
   * @param skill The UserSkill entity.
   * @returns The mapped UserSkillData.
   */
  private mapToUserSkillData(skill: UserSkill): UserSkillData {
    return {
      id: skill.id,
      skillName: skill.skillName,
      proficiency: skill.proficiency,
      yearsExperience: skill.yearsExperience,
      createdAt: skill.createdAt,
      updatedAt: skill.updatedAt,
    };
  }
}

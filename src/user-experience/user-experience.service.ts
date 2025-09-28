import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { UserExperience } from '../entities/user-experience.entity';
import { User } from '../entities/user.entity';
import { CreateUserExperienceDto } from './dto/create-user-experience.dto';
import { UpdateUserExperienceDto } from './dto/update-user-experience.dto';
import type { UserExperienceData, PaginatedUserExperiencesData } from '../utils/types/user.type';
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';

/**
 * Application service that encapsulates user experience management tasks.
 */
@Injectable()
export class UserExperienceService {
  /**
   * Construct the service with persistence dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userExperienceRepository TypeORM repository managing {@link UserExperience} entities.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserExperience)
    private readonly userExperienceRepository: Repository<UserExperience>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new user experience.
   *
   * @param userId Identifier of the user.
   * @param createUserExperienceDto Data for creating the experience.
   * @returns The created user experience.
   * @throws NotFoundException When the user cannot be located.
   */
  async create(
    userId: string,
    createUserExperienceDto: CreateUserExperienceDto,
  ): Promise<UserExperienceData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userExperience = this.userExperienceRepository.create({
      userId,
      ...createUserExperienceDto,
    });

    const savedExperience = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserExperience) : this.userExperienceRepository;
      return repo.save(userExperience);
    });
    return this.mapToUserExperienceData(savedExperience);
  }

  /**
   * Retrieve paginated list of user experiences.
   *
   * @param userId Identifier of the user.
   * @param page Page number (1-based).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated user experiences data.
   */
  async findAll(userId: string, page = 1, limit = 10): Promise<PaginatedUserExperiencesData> {
    const [experiences, total] = await this.userExperienceRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPage = Math.ceil(total / limit);

    return {
      data: experiences.map((experience) => this.mapToUserExperienceData(experience)),
      totalData: total,
      page,
      limit,
      totalPage,
    };
  }

  /**
   * Retrieve a single user experience by ID.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the experience.
   * @returns The user experience data.
   * @throws NotFoundException When the experience cannot be located or doesn't belong to the user.
   */
  async findOne(userId: string, id: string): Promise<UserExperienceData> {
    const experience = await this.userExperienceRepository.findOne({
      where: { id, userId },
    });

    if (!experience) {
      throw new NotFoundException('User experience not found.');
    }

    return this.mapToUserExperienceData(experience);
  }

  /**
   * Update a user experience.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the experience to update.
   * @param updateUserExperienceDto Data for updating the experience.
   * @returns The updated user experience.
   * @throws NotFoundException When the experience cannot be located or doesn't belong to the user.
   */
  async update(
    userId: string,
    id: string,
    updateUserExperienceDto: UpdateUserExperienceDto,
  ): Promise<UserExperienceData> {
    const experience = await this.userExperienceRepository.findOne({
      where: { id, userId },
    });

    if (!experience) {
      throw new NotFoundException('User experience not found.');
    }

    Object.assign(experience, updateUserExperienceDto);
    const updatedExperience = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserExperience) : this.userExperienceRepository;
      return repo.save(experience);
    });

    return this.mapToUserExperienceData(updatedExperience);
  }

  /**
   * Remove a user experience.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the experience to remove.
   * @throws NotFoundException When the experience cannot be located or doesn't belong to the user.
   */
  async remove(userId: string, id: string): Promise<void> {
    const experience = await this.userExperienceRepository.findOne({
      where: { id, userId },
    });

    if (!experience) {
      throw new NotFoundException('User experience not found.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserExperience) : this.userExperienceRepository;
      await repo.remove(experience);
      return undefined;
    });
  }

  /**
   * Map UserExperience entity to UserExperienceData type.
   *
   * @param experience The UserExperience entity.
   * @returns The mapped UserExperienceData.
   */
  private mapToUserExperienceData(experience: UserExperience): UserExperienceData {
    return {
      id: experience.id,
      title: experience.title,
      company: experience.company,
      type: experience.type,
      location: experience.location,
      fromMonth: experience.fromMonth,
      fromYear: experience.fromYear,
      toMonth: experience.toMonth,
      toYear: experience.toYear,
      description: experience.description,
      createdAt: experience.createdAt,
      updatedAt: experience.updatedAt,
    };
  }
}

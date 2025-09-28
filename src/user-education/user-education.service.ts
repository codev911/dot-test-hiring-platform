import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { UserEducation } from '../entities/user-education.entity';
import { User } from '../entities/user.entity';
import { CreateUserEducationDto } from './dto/create-user-education.dto';
import { UpdateUserEducationDto } from './dto/update-user-education.dto';
import type { UserEducationData, PaginatedUserEducationsData } from '../utils/types/user.type';
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';

/**
 * Application service that encapsulates user education management tasks.
 */
@Injectable()
export class UserEducationService {
  /**
   * Construct the service with persistence dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userEducationRepository TypeORM repository managing {@link UserEducation} entities.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserEducation)
    private readonly userEducationRepository: Repository<UserEducation>,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new user education.
   *
   * @param userId Identifier of the user.
   * @param createUserEducationDto Data for creating the education.
   * @returns The created user education.
   * @throws NotFoundException When the user cannot be located.
   */
  async create(
    userId: string,
    createUserEducationDto: CreateUserEducationDto,
  ): Promise<UserEducationData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userEducation = this.userEducationRepository.create({
      userId,
      ...createUserEducationDto,
    });

    const savedEducation = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserEducation) : this.userEducationRepository;
      return repo.save(userEducation);
    });
    return this.mapToUserEducationData(savedEducation);
  }

  /**
   * Retrieve paginated list of user educations.
   *
   * @param userId Identifier of the user.
   * @param page Page number (1-based).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated user educations data.
   */
  async findAll(userId: string, page = 1, limit = 10): Promise<PaginatedUserEducationsData> {
    const [educations, total] = await this.userEducationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPage = Math.ceil(total / limit);

    return {
      data: educations.map((education) => this.mapToUserEducationData(education)),
      totalData: total,
      page,
      limit,
      totalPage,
    };
  }

  /**
   * Retrieve a single user education by ID.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the education.
   * @returns The user education data.
   * @throws NotFoundException When the education cannot be located or doesn't belong to the user.
   */
  async findOne(userId: string, id: string): Promise<UserEducationData> {
    const education = await this.userEducationRepository.findOne({
      where: { id, userId },
    });

    if (!education) {
      throw new NotFoundException('User education not found.');
    }

    return this.mapToUserEducationData(education);
  }

  /**
   * Update a user education.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the education to update.
   * @param updateUserEducationDto Data for updating the education.
   * @returns The updated user education.
   * @throws NotFoundException When the education cannot be located or doesn't belong to the user.
   */
  async update(
    userId: string,
    id: string,
    updateUserEducationDto: UpdateUserEducationDto,
  ): Promise<UserEducationData> {
    const education = await this.userEducationRepository.findOne({
      where: { id, userId },
    });

    if (!education) {
      throw new NotFoundException('User education not found.');
    }

    Object.assign(education, updateUserEducationDto);
    const updatedEducation = await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserEducation) : this.userEducationRepository;
      return repo.save(education);
    });

    return this.mapToUserEducationData(updatedEducation);
  }

  /**
   * Remove a user education.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the education to remove.
   * @throws NotFoundException When the education cannot be located or doesn't belong to the user.
   */
  async remove(userId: string, id: string): Promise<void> {
    const education = await this.userEducationRepository.findOne({
      where: { id, userId },
    });

    if (!education) {
      throw new NotFoundException('User education not found.');
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserEducation) : this.userEducationRepository;
      await repo.remove(education);
      return undefined;
    });
  }

  /**
   * Map UserEducation entity to UserEducationData type.
   *
   * @param education The UserEducation entity.
   * @returns The mapped UserEducationData.
   */
  private mapToUserEducationData(education: UserEducation): UserEducationData {
    return {
      id: education.id,
      institution: education.institution,
      educationLevel: education.educationLevel,
      fromMonth: education.fromMonth,
      fromYear: education.fromYear,
      toMonth: education.toMonth,
      toYear: education.toYear,
      description: education.description,
      createdAt: education.createdAt,
      updatedAt: education.updatedAt,
    };
  }
}

import path from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { UserCertification } from '../entities/user-certification.entity';
import { User } from '../entities/user.entity';
import { BucketService } from '../services/bucket.service';
import { CreateUserCertificationDto } from './dto/create-user-certification.dto';
import { UpdateUserCertificationDto } from './dto/update-user-certification.dto';
import type {
  UserCertificationData,
  PaginatedUserCertificationsData,
} from '../utils/types/user.type';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';

/**
 * Application service that encapsulates user certification management tasks.
 */
@Injectable()
export class UserCertificationService {
  /**
   * Construct the service with persistence and storage dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userCertificationRepository TypeORM repository managing {@link UserCertification} entities.
   * @param bucketService Service responsible for interacting with object storage.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserCertification)
    private readonly userCertificationRepository: Repository<UserCertification>,
    private readonly bucketService: BucketService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Create a new user certification.
   *
   * @param userId Identifier of the user.
   * @param createUserCertificationDto Data for creating the certification.
   * @returns The created user certification.
   * @throws NotFoundException When the user cannot be located.
   */
  async create(
    userId: string,
    createUserCertificationDto: CreateUserCertificationDto,
  ): Promise<UserCertificationData> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const userCertification = this.userCertificationRepository.create({
      userId,
      ...createUserCertificationDto,
    });

    const savedCertification = await withTransaction(
      this.dataSource,
      async (em?: EntityManager) => {
        const repo = em ? em.getRepository(UserCertification) : this.userCertificationRepository;
        return repo.save(userCertification);
      },
    );
    return this.mapToUserCertificationData(savedCertification);
  }

  /**
   * Retrieve paginated list of user certifications.
   *
   * @param userId Identifier of the user.
   * @param page Page number (1-based).
   * @param limit Number of items per page (default: 10).
   * @returns Paginated user certifications data.
   */
  async findAll(userId: string, page = 1, limit = 10): Promise<PaginatedUserCertificationsData> {
    const [certifications, total] = await this.userCertificationRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const totalPage = Math.ceil(total / limit);

    return {
      data: certifications.map((certification) => this.mapToUserCertificationData(certification)),
      totalData: total,
      page,
      limit,
      totalPage,
    };
  }

  /**
   * Retrieve a single user certification by ID.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the certification.
   * @returns The user certification data.
   * @throws NotFoundException When the certification cannot be located or doesn't belong to the user.
   */
  async findOne(userId: string, id: string): Promise<UserCertificationData> {
    const certification = await this.userCertificationRepository.findOne({
      where: { id, userId },
    });

    if (!certification) {
      throw new NotFoundException('User certification not found.');
    }

    return this.mapToUserCertificationData(certification);
  }

  /**
   * Update a user certification.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the certification to update.
   * @param updateUserCertificationDto Data for updating the certification.
   * @returns The updated user certification.
   * @throws NotFoundException When the certification cannot be located or doesn't belong to the user.
   */
  async update(
    userId: string,
    id: string,
    updateUserCertificationDto: UpdateUserCertificationDto,
  ): Promise<UserCertificationData> {
    const certification = await this.userCertificationRepository.findOne({
      where: { id, userId },
    });

    if (!certification) {
      throw new NotFoundException('User certification not found.');
    }

    Object.assign(certification, updateUserCertificationDto);
    const updatedCertification = await withTransaction(
      this.dataSource,
      async (em?: EntityManager) => {
        const repo = em ? em.getRepository(UserCertification) : this.userCertificationRepository;
        return repo.save(certification);
      },
    );

    return this.mapToUserCertificationData(updatedCertification);
  }

  /**
   * Remove a user certification.
   *
   * @param userId Identifier of the user.
   * @param id Identifier of the certification to remove.
   * @throws NotFoundException When the certification cannot be located or doesn't belong to the user.
   */
  async remove(userId: string, id: string): Promise<void> {
    const certification = await this.userCertificationRepository.findOne({
      where: { id, userId },
    });

    if (!certification) {
      throw new NotFoundException('User certification not found.');
    }

    // Delete certificate file if exists
    if (certification.certificatePath) {
      try {
        await this.bucketService.deleteObject(certification.certificatePath);
      } catch (error) {
        // Log error but continue with deletion
        // eslint-disable-next-line no-console
        console.warn(`Failed to delete certificate file: ${certification.certificatePath}`, error);
      }
    }

    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserCertification) : this.userCertificationRepository;
      await repo.remove(certification);
      return undefined;
    });
  }

  /**
   * Upload certificate PDF for a specific certification.
   *
   * @param userId Identifier of the user.
   * @param certificationId Identifier of the certification.
   * @param file Uploaded PDF certificate file.
   * @returns Response containing the certificate URL.
   * @throws NotFoundException When the certification cannot be located or doesn't belong to the user.
   */
  async uploadCertificate(
    userId: string,
    certificationId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; data: { certificateUrl: string | null } }> {
    const certification = await this.userCertificationRepository.findOne({
      where: { id: certificationId, userId },
    });

    if (!certification) {
      throw new NotFoundException('User certification not found.');
    }

    // Generate unique filename with original extension
    const fileExtension = path.extname(file.originalname) || '.pdf';
    const fileName = `${certification.certificationName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${Date.now()}${fileExtension}`;
    const key = path.posix.join('certificate', userId, fileName);

    // Delete old certificate file if exists
    if (certification.certificatePath) {
      try {
        await this.bucketService.deleteObject(certification.certificatePath);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(
          `Failed to delete old certificate file: ${certification.certificatePath}`,
          error,
        );
      }
    }

    // Upload new file
    await this.bucketService.uploadObject(
      key,
      file.buffer as unknown as PutObjectCommandInput['Body'],
      'application/pdf',
    );

    // Update certification record
    certification.certificatePath = key;
    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserCertification) : this.userCertificationRepository;
      await repo.save(certification);
      return undefined;
    });

    return {
      message: 'Certificate uploaded or replaced successfully.',
      data: {
        certificateUrl: String(this.bucketService.getPublicUrl(key)),
      },
    };
  }

  /**
   * Map UserCertification entity to UserCertificationData type.
   *
   * @param certification The UserCertification entity.
   * @returns The mapped UserCertificationData.
   */
  private mapToUserCertificationData(certification: UserCertification): UserCertificationData {
    return {
      id: certification.id,
      certificationName: certification.certificationName,
      issuingOrganization: certification.issuingOrganization,
      issuedMonth: certification.issuedMonth,
      issuedYear: certification.issuedYear,
      expiredMonth: certification.expiredMonth,
      expiredYear: certification.expiredYear,
      certificationId: certification.certificationId,
      certificationUrl: certification.certificationUrl,
      certificateUrl: certification.certificatePath
        ? String(this.bucketService.getPublicUrl(certification.certificatePath))
        : null,
      createdAt: certification.createdAt,
      updatedAt: certification.updatedAt,
    };
  }
}

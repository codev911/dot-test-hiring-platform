import path from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserResume } from '../entities/user-resume.entity';
import { BucketService } from '../services/bucket.service';
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';
import type { UserResumeData } from '../utils/types/user.type';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { CacheHelperService } from '../utils/cache/cache.service';
import { buildCacheKey, buildHttpCacheKeyForUserPath } from '../utils/cache/cache.util';

/**
 * Application service that encapsulates user resume management tasks.
 */
@Injectable()
export class UserResumeService {
  /**
   * Construct the service with persistence and storage dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param userResumeRepository TypeORM repository managing {@link UserResume} entities.
   * @param bucketService Service responsible for interacting with object storage.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserResume)
    private readonly userResumeRepository: Repository<UserResume>,
    private readonly bucketService: BucketService,
    private readonly cache: CacheHelperService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Get the user's resume URL if available.
   *
   * @param userId Identifier of the account whose resume is being retrieved.
   * @returns Response containing the resume URL or null if no resume uploaded.
   * @throws NotFoundException When the user cannot be located.
   */
  async getResume(userId: string): Promise<{ message: string; data: UserResumeData }> {
    const key = buildCacheKey('user', 'resume', userId);

    return this.cache.getOrSet(
      key,
      async () => {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
          throw new NotFoundException('User not found.');
        }

        const userResume = await this.userResumeRepository.findOne({ where: { userId } });

        return {
          message: 'Resume retrieved successfully.',
          data: {
            resumeUrl: userResume
              ? String(this.bucketService.getPublicUrl(userResume.resumePath))
              : null,
          },
        };
      },
      300_000, // 5 minutes TTL
    );
  }

  /**
   * Upload or replace the user's resume in object storage and persist the new key.
   *
   * @param userId Identifier of the account whose resume is being updated.
   * @param file Uploaded PDF resume file captured by Multer.
   * @returns Response containing the new resume URL.
   * @throws NotFoundException When the user cannot be located.
   */
  async uploadResume(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; data: UserResumeData }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const key = path.posix.join('resume', `${userId}.pdf`);

    const existing = await this.userResumeRepository.findOne({ where: { userId } });
    if (existing && existing.resumePath && existing.resumePath !== key) {
      await this.bucketService.deleteObject(existing.resumePath);
    }

    await this.bucketService.uploadObject(
      key,
      file.buffer as unknown as PutObjectCommandInput['Body'],
      'application/pdf',
    );

    const record = existing ?? this.userResumeRepository.create({ userId, resumePath: key });
    record.resumePath = key;
    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(UserResume) : this.userResumeRepository;
      await repo.save(record);
      return undefined;
    });

    // Invalidate caches (service-level and HTTP-level)
    await this.cache.del(buildCacheKey('user', 'resume', userId));
    await this.cache.del(buildHttpCacheKeyForUserPath(userId, '/user/resume'));

    return {
      message: 'Resume uploaded successfully.',
      data: {
        resumeUrl: String(this.bucketService.getPublicUrl(key)),
      },
    };
  }
}

import path from 'node:path';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { User } from '../entities/user.entity';
import { BucketService } from '../services/bucket.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { UserAvatarData, PasswordChangeData } from '../utils/types/user.type';
import { HashingService } from '../services/hashing.service';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { withTransaction } from '../utils/database/transaction.util';
import { Optional } from '@nestjs/common';

/**
 * Application service that encapsulates user profile management tasks.
 */
@Injectable()
export class UserService {
  /**
   * Construct the service with persistence and storage dependencies.
   *
   * @param userRepository TypeORM repository managing {@link User} entities.
   * @param bucketService Service responsible for interacting with object storage.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly bucketService: BucketService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  /**
   * Update the authenticated user's password after validating the existing credential.
   *
   * @param userId Identifier of the account to update.
   * @param dto Payload containing the current, new, and confirmation passwords.
   * @returns Message payload acknowledging the successful update.
   * @throws NotFoundException When the user cannot be located.
   * @throws UnauthorizedException When the supplied current password is incorrect.
   * @throws BadRequestException When the new password and confirmation do not match.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{
    message: string;
    data: PasswordChangeData;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.comparePassword(dto.currentPassword)) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match.');
    }

    user.password = UserService.hashPassword(user.email, dto.newPassword);
    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(User) : this.userRepository;
      await repo.save(user);
      return undefined;
    });

    return {
      message: 'Password updated successfully.',
      data: { userId: user.id },
    };
  }

  /**
   * Upload or replace the user's avatar in object storage and persist the new key.
   *
   * @param userId Identifier of the account whose avatar is being updated.
   * @param file Uploaded avatar file captured by Multer.
   * @returns Response containing the new avatar URL.
   * @throws NotFoundException When the user cannot be located.
   */
  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ message: string; data: UserAvatarData }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const extension = this.resolveExtension(file);
    const key = this.buildAvatarKey(userId, extension);

    const previousKey = user.avatarPath;
    if (typeof previousKey === 'string' && previousKey !== key) {
      await this.bucketService.deleteObject(previousKey);
    }

    await this.bucketService.uploadObject(
      key,
      file.buffer as unknown as PutObjectCommandInput['Body'],
      String(file.mimetype),
    );

    user.avatarPath = key;
    await withTransaction(this.dataSource, async (em?: EntityManager) => {
      const repo = em ? em.getRepository(User) : this.userRepository;
      await repo.save(user);
      return undefined;
    });

    return {
      message: 'Avatar updated successfully.',
      data: {
        avatarUrl: String(this.bucketService.getPublicUrl(key)),
      },
    };
  }

  /**
   * Retrieve the public avatar URL for the authenticated user.
   *
   * @param userId Identifier of the account.
   * @returns Response containing the avatar URL or null when absent.
   * @throws NotFoundException When the user cannot be located.
   */
  async getAvatar(userId: string): Promise<{ message: string; data: UserAvatarData }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const url: string | null = user.avatarPath
      ? String(this.bucketService.getPublicUrl(user.avatarPath))
      : null;

    return {
      message: 'Avatar retrieved successfully.',
      data: {
        avatarUrl: url,
      },
    };
  }

  /**
   * Hash the provided password using the same scheme as entity hooks.
   *
   * @param email Email used to salt the password hash.
   * @param password Plain text password that should be persisted.
   * @returns Hashed password value.
   */
  private static hashPassword(email: string, password: string): string {
    return HashingService.hash(`${email}${password}`);
  }

  /**
   * Derive the avatar key used to store the asset in object storage.
   *
   * @param userId Identifier of the owner.
   * @param extension File extension including leading period.
   * @returns Object storage key for the avatar.
   */
  private buildAvatarKey(userId: string, extension: string): string {
    const safeExtension = extension || '.png';
    return path.posix.join('profile', `${userId}${safeExtension}`);
  }

  /**
   * Resolve the file extension for the uploaded avatar.
   *
   * @param file Uploaded file metadata.
   * @returns Extension including the leading period.
   */
  private resolveExtension(file: Express.Multer.File): string {
    const ext = path.extname(String(file.originalname)).toLowerCase();

    if (ext) {
      return ext;
    }

    const mimeExtension = this.extensionFromMime(String(file.mimetype));
    return mimeExtension ? `.${mimeExtension}` : '.png';
  }

  /**
   * Map mime types to file extensions for avatar uploads.
   *
   * @param mimetype Reported mime type from Multer.
   * @returns File extension without leading period.
   */
  private extensionFromMime(mimetype: string): string | undefined {
    const map: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };

    return map[mimetype];
  }
}

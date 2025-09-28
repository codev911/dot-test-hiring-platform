import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Express } from 'express';
import type { Repository } from 'typeorm';
import { UserService } from '../../src/user/user.service';
import { User } from '../../src/entities/user.entity';
import { BucketService } from '../../src/services/bucket.service';
import { HashingService } from '../../src/services/hashing.service';
import type { ChangePasswordDto } from '../../src/user/dto/change-password.dto';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let bucketService: jest.Mocked<BucketService>;

  const userId = 'user-1';
  const email = 'user@example.com';
  const password = 'Password123!';

  const createUser = (overrides: Partial<User> = {}): User => {
    const user = new User();
    (user as Mutable<User>).id = overrides.id ?? userId;
    user.firstName = overrides.firstName ?? 'Jane';
    user.lastName = overrides.lastName;
    user.email = overrides.email ?? email;
    (user as Mutable<User>).password =
      overrides.password ?? HashingService.hash(`${user.email}${password}`);
    user.avatarPath = overrides.avatarPath;
    return user;
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    bucketService = {
      uploadObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn().mockReturnValue('http://localhost:9000/bucket/profile/user-1.png'),
    } as unknown as jest.Mocked<BucketService>;

    service = new UserService(userRepository, bucketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('changePassword', () => {
    it('updates password when current password matches and confirmation valid', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);

      const dto = {
        currentPassword: password,
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      } as ChangePasswordDto;

      const response = await service.changePassword(userId, dto);

      expect(response).toEqual({
        message: 'Password updated successfully.',
        data: { userId },
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: userId }));
      const savedUser = (userRepository.save as jest.Mock).mock.calls[0][0] as User;
      expect(savedUser.password).toBe(HashingService.hash(`${email}${dto.newPassword}`));
    });

    it('throws when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.changePassword(userId, {
          currentPassword: password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        } as ChangePasswordDto),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when current password mismatches', async () => {
      const user = createUser({ password: HashingService.hash(`${email}Other123!`) });
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        service.changePassword(userId, {
          currentPassword: password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        } as ChangePasswordDto),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when confirmation mismatches', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);

      await expect(
        service.changePassword(userId, {
          currentPassword: password,
          newPassword: 'NewPassword123!',
          confirmPassword: 'Mismatch123!',
        } as ChangePasswordDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateAvatar', () => {
    const file = {
      originalname: 'avatar.png',
      mimetype: 'image/png',
      buffer: Buffer.from('avatar'),
    } as unknown as Express.Multer.File;

    it('stores avatar and returns public url', async () => {
      const user = createUser({ avatarPath: undefined });
      userRepository.findOne.mockResolvedValue(user);

      const response = await service.updateAvatar(userId, file);

      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        'profile/user-1.png',
        file.buffer,
        file.mimetype,
      );
      expect(bucketService.deleteObject).not.toHaveBeenCalled();
      expect(userRepository.save).toHaveBeenCalledWith(user);
      expect(user.avatarPath).toBe('profile/user-1.png');
      expect(response).toEqual({
        message: 'Avatar updated successfully.',
        data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
      });
    });

    it('replaces previous avatar and deletes old object when key changes', async () => {
      const user = createUser({ avatarPath: 'profile/user-1.jpg' });
      userRepository.findOne.mockResolvedValue(user);

      await service.updateAvatar(userId, file);

      expect(bucketService.deleteObject).toHaveBeenCalledWith('profile/user-1.jpg');
      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        'profile/user-1.png',
        file.buffer,
        file.mimetype,
      );
    });

    it('throws when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateAvatar(userId, file)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getAvatar', () => {
    it('returns avatar url when present', async () => {
      const user = createUser({ avatarPath: 'profile/user-1.png' });
      userRepository.findOne.mockResolvedValue(user);

      const response = await service.getAvatar(userId);

      expect(response).toEqual({
        message: 'Avatar retrieved successfully.',
        data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
      });
    });

    it('returns null avatar when none exists', async () => {
      const user = createUser({ avatarPath: undefined });
      userRepository.findOne.mockResolvedValue(user);

      const response = await service.getAvatar(userId);

      expect(response).toEqual({
        message: 'Avatar retrieved successfully.',
        data: { avatarUrl: null },
      });
    });

    it('throws when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getAvatar(userId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('resolveExtension', () => {
    it('returns extension from filename when present', () => {
      const file = { originalname: 'test.jpg', mimetype: 'image/jpeg' } as Express.Multer.File;
      const result = (service as any).resolveExtension(file);
      expect(result).toBe('.jpg');
    });

    it('returns extension from mimetype when filename has no extension', () => {
      const file = { originalname: 'test', mimetype: 'image/jpeg' } as Express.Multer.File;
      const result = (service as any).resolveExtension(file);
      expect(result).toBe('.jpg');
    });

    it('returns .png fallback when mimetype is unknown', () => {
      const file = { originalname: 'test', mimetype: 'application/unknown' } as Express.Multer.File;
      const result = (service as any).resolveExtension(file);
      expect(result).toBe('.png');
    });
  });

  describe('extensionFromMime', () => {
    it('returns correct extension for known mimetypes', () => {
      expect((service as any).extensionFromMime('image/jpeg')).toBe('jpg');
      expect((service as any).extensionFromMime('image/png')).toBe('png');
      expect((service as any).extensionFromMime('image/gif')).toBe('gif');
      expect((service as any).extensionFromMime('image/webp')).toBe('webp');
    });

    it('returns undefined for unknown mimetypes', () => {
      expect((service as any).extensionFromMime('application/unknown')).toBeUndefined();
      expect((service as any).extensionFromMime('text/plain')).toBeUndefined();
    });
  });
});

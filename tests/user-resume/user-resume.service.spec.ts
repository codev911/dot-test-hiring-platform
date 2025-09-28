import { NotFoundException } from '@nestjs/common';
import type { Express } from 'express';
import type { Repository } from 'typeorm';
import { UserResumeService } from '../../src/user-resume/user-resume.service';
import { User } from '../../src/entities/user.entity';
import { UserResume } from '../../src/entities/user-resume.entity';
import { BucketService } from '../../src/services/bucket.service';
import { HashingService } from '../../src/services/hashing.service';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe('UserResumeService', () => {
  let service: UserResumeService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userResumeRepository: jest.Mocked<Repository<UserResume>>;
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
    } as unknown as jest.Mocked<Repository<User>>;

    userResumeRepository = {
      findOne: jest.fn(),
      create: jest.fn((e: unknown) => e as UserResume),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<UserResume>>;

    bucketService = {
      uploadObject: jest.fn(),
      deleteObject: jest.fn(),
      getPublicUrl: jest.fn().mockReturnValue('http://localhost:9000/bucket/resume/user-1.pdf'),
    } as unknown as jest.Mocked<BucketService>;

    const cache = {
      getOrSet: jest.fn((_k: string, supplier: any) => supplier()),
      del: jest.fn(),
    } as any;
    service = new UserResumeService(userRepository, userResumeRepository, bucketService, cache);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadResume', () => {
    const pdf = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    } as unknown as Express.Multer.File;

    it('stores resume and returns public url, replacing previous when present', async () => {
      const user = createUser({});
      userRepository.findOne.mockResolvedValue(user);
      userResumeRepository.findOne.mockResolvedValue({
        userId,
        resumePath: 'resume/old.pdf',
      } as UserResume);

      const response = await service.uploadResume(userId, pdf);

      expect(bucketService.deleteObject).toHaveBeenCalledWith('resume/old.pdf');
      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        'resume/user-1.pdf',
        pdf.buffer,
        'application/pdf',
      );
      expect(userResumeRepository.save).toHaveBeenCalledWith({
        userId,
        resumePath: 'resume/user-1.pdf',
      });
      expect(response).toEqual({
        message: 'Resume uploaded successfully.',
        data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
      });
    });

    it('creates new resume record when none exists', async () => {
      const user = createUser({});
      userRepository.findOne.mockResolvedValue(user);
      userResumeRepository.findOne.mockResolvedValue(null);
      const newRecord = { userId, resumePath: 'resume/user-1.pdf' } as UserResume;
      userResumeRepository.create.mockReturnValue(newRecord);

      const response = await service.uploadResume(userId, pdf);

      expect(bucketService.deleteObject).not.toHaveBeenCalled();
      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        'resume/user-1.pdf',
        pdf.buffer,
        'application/pdf',
      );
      expect(userResumeRepository.create).toHaveBeenCalledWith({
        userId,
        resumePath: 'resume/user-1.pdf',
      });
      expect(userResumeRepository.save).toHaveBeenCalledWith(newRecord);
      expect(response).toEqual({
        message: 'Resume uploaded successfully.',
        data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
      });
    });

    it('throws when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadResume(userId, pdf)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getResume', () => {
    it('returns resume url when present', async () => {
      const user = createUser({});
      userRepository.findOne.mockResolvedValue(user);
      userResumeRepository.findOne.mockResolvedValue({
        userId,
        resumePath: 'resume/user-1.pdf',
      } as UserResume);

      const result = await service.getResume(userId);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(userResumeRepository.findOne).toHaveBeenCalledWith({ where: { userId } });
      expect(bucketService.getPublicUrl).toHaveBeenCalledWith('resume/user-1.pdf');
      expect(result).toEqual({
        message: 'Resume retrieved successfully.',
        data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
      });
    });

    it('returns null when resume not uploaded', async () => {
      const user = createUser({});
      userRepository.findOne.mockResolvedValue(user);
      userResumeRepository.findOne.mockResolvedValue(null);

      const result = await service.getResume(userId);

      expect(result).toEqual({
        message: 'Resume retrieved successfully.',
        data: { resumeUrl: null },
      });
    });

    it('throws NotFound when user missing', async () => {
      userRepository.findOne.mockResolvedValue(null);
      await expect(service.getResume(userId)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserCertificationService } from '../../src/user-certification/user-certification.service';
import { UserCertification } from '../../src/entities/user-certification.entity';
import { User } from '../../src/entities/user.entity';
import { BucketService } from '../../src/services/bucket.service';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { Month } from '../../src/utils/enums/month.enum';
import type { CreateUserCertificationDto } from '../../src/user-certification/dto/create-user-certification.dto';
import type { UpdateUserCertificationDto } from '../../src/user-certification/dto/update-user-certification.dto';

const mockUserId = 'user-1';
const mockCertificationId = 'certification-1';
const mockCertificatePath = 'certificate/user-1/aws-cert-1234567890.pdf';
const mockCertificateUrl =
  'http://localhost:9000/bucket/certificate/user-1/aws-cert-1234567890.pdf';

const makeMockUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  Object.assign(user, {
    id: mockUserId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'hashed-password',
    ...overrides,
  });
  return user;
};

const makeMockUserCertification = (
  overrides: Partial<UserCertification> = {},
): UserCertification => {
  const certification = new UserCertification();
  Object.assign(certification, {
    id: mockCertificationId,
    userId: mockUserId,
    certificationName: 'AWS Certified Solutions Architect',
    issuingOrganization: 'Amazon Web Services',
    issuedMonth: Month.JANUARY,
    issuedYear: 2023,
    expiredMonth: Month.JANUARY,
    expiredYear: 2026,
    certificationId: 'AWS-SAA-C03-123456',
    certificationUrl: 'https://www.credly.com/badges/123456',
    certificatePath: mockCertificatePath,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    ...overrides,
  });
  return certification;
};

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'aws-cert.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('mock-pdf-content'),
  size: 1024,
} as Express.Multer.File;

describe('UserCertificationService', () => {
  let service: UserCertificationService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userCertificationRepository: jest.Mocked<Repository<UserCertification>>;
  let bucketService: jest.Mocked<BucketService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserCertificationService,
        {
          provide: CacheHelperService,
          useValue: { getOrSet: jest.fn((_k: string, s: any) => s()), del: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserCertification),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: BucketService,
          useValue: {
            uploadObject: jest.fn(),
            deleteObject: jest.fn(),
            getPublicUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserCertificationService>(UserCertificationService);
    userRepository = module.get(getRepositoryToken(User));
    userCertificationRepository = module.get(getRepositoryToken(UserCertification));
    bucketService = module.get(BucketService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user certification successfully', async () => {
      const createDto: CreateUserCertificationDto = {
        certificationName: 'Google Cloud Professional',
        issuingOrganization: 'Google Cloud',
        issuedYear: 2023,
        expiredYear: 2026,
      };
      const user = makeMockUser();
      const createdCertification = makeMockUserCertification({
        certificationName: 'Google Cloud Professional',
        issuingOrganization: 'Google Cloud',
        issuedYear: 2023,
        expiredYear: 2026,
        certificatePath: undefined,
      });

      userRepository.findOne.mockResolvedValue(user);
      userCertificationRepository.create.mockReturnValue(createdCertification);
      userCertificationRepository.save.mockResolvedValue(createdCertification);
      bucketService.getPublicUrl.mockReturnValue(mockCertificateUrl);

      const result = await service.create(mockUserId, createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(userCertificationRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...createDto,
      });
      expect(userCertificationRepository.save).toHaveBeenCalledWith(createdCertification);
      expect(result).toEqual({
        id: createdCertification.id,
        certificationName: createdCertification.certificationName,
        issuingOrganization: createdCertification.issuingOrganization,
        issuedMonth: createdCertification.issuedMonth,
        issuedYear: createdCertification.issuedYear,
        expiredMonth: createdCertification.expiredMonth,
        expiredYear: createdCertification.expiredYear,
        certificationId: createdCertification.certificationId,
        certificationUrl: createdCertification.certificationUrl,
        certificateUrl: null,
        createdAt: createdCertification.createdAt,
        updatedAt: createdCertification.updatedAt,
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      const createDto: CreateUserCertificationDto = {
        certificationName: 'Google Cloud Professional',
        issuingOrganization: 'Google Cloud',
        issuedYear: 2023,
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new NotFoundException('User not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated user certifications', async () => {
      const certifications = [
        makeMockUserCertification({ id: '1', certificationName: 'AWS Solutions Architect' }),
        makeMockUserCertification({ id: '2', certificationName: 'Google Cloud Professional' }),
      ];
      const total = 2;

      userCertificationRepository.findAndCount.mockResolvedValue([certifications, total]);
      bucketService.getPublicUrl.mockReturnValue(mockCertificateUrl);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(userCertificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: certifications.map((certification) => ({
          id: certification.id,
          certificationName: certification.certificationName,
          issuingOrganization: certification.issuingOrganization,
          issuedMonth: certification.issuedMonth,
          issuedYear: certification.issuedYear,
          expiredMonth: certification.expiredMonth,
          expiredYear: certification.expiredYear,
          certificationId: certification.certificationId,
          certificationUrl: certification.certificationUrl,
          certificateUrl: mockCertificateUrl,
          createdAt: certification.createdAt,
          updatedAt: certification.updatedAt,
        })),
        totalData: total,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });

    it('calculates correct pagination for multiple pages', async () => {
      const certifications = Array.from({ length: 10 }, (_, i) =>
        makeMockUserCertification({ id: `${i + 1}` }),
      );
      const total = 25;

      userCertificationRepository.findAndCount.mockResolvedValue([certifications, total]);
      bucketService.getPublicUrl.mockReturnValue(mockCertificateUrl);

      const result = await service.findAll(mockUserId, 2, 10);

      expect(userCertificationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
      expect(result.totalPage).toBe(3);
      expect(result.page).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns a user certification by ID', async () => {
      const certification = makeMockUserCertification();

      userCertificationRepository.findOne.mockResolvedValue(certification);
      bucketService.getPublicUrl.mockReturnValue(mockCertificateUrl);

      const result = await service.findOne(mockUserId, mockCertificationId);

      expect(userCertificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCertificationId, userId: mockUserId },
      });
      expect(result).toEqual({
        id: certification.id,
        certificationName: certification.certificationName,
        issuingOrganization: certification.issuingOrganization,
        issuedMonth: certification.issuedMonth,
        issuedYear: certification.issuedYear,
        expiredMonth: certification.expiredMonth,
        expiredYear: certification.expiredYear,
        certificationId: certification.certificationId,
        certificationUrl: certification.certificationUrl,
        certificateUrl: mockCertificateUrl,
        createdAt: certification.createdAt,
        updatedAt: certification.updatedAt,
      });
    });

    it('throws NotFoundException when certification does not exist', async () => {
      userCertificationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockCertificationId)).rejects.toThrow(
        new NotFoundException('User certification not found.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user certification successfully', async () => {
      const updateDto: UpdateUserCertificationDto = {
        certificationName: 'AWS Certified Solutions Architect - Professional',
        expiredYear: 2027,
      };
      const existingCertification = makeMockUserCertification();
      const updatedCertification = { ...existingCertification, ...updateDto };

      userCertificationRepository.findOne.mockResolvedValue(existingCertification);
      userCertificationRepository.save.mockResolvedValue(updatedCertification as UserCertification);
      bucketService.getPublicUrl.mockReturnValue(mockCertificateUrl);

      const result = await service.update(mockUserId, mockCertificationId, updateDto);

      expect(userCertificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCertificationId, userId: mockUserId },
      });
      expect(userCertificationRepository.save).toHaveBeenCalledWith({
        ...existingCertification,
        ...updateDto,
      });
      expect(result.certificationName).toBe('AWS Certified Solutions Architect - Professional');
      expect(result.expiredYear).toBe(2027);
    });

    it('throws NotFoundException when certification does not exist', async () => {
      const updateDto: UpdateUserCertificationDto = {
        certificationName: 'AWS Certified Solutions Architect - Professional',
      };

      userCertificationRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockUserId, mockCertificationId, updateDto)).rejects.toThrow(
        new NotFoundException('User certification not found.'),
      );
    });
  });

  describe('remove', () => {
    it('removes a user certification successfully', async () => {
      const certification = makeMockUserCertification();

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.remove.mockResolvedValue(certification);

      await service.remove(mockUserId, mockCertificationId);

      expect(userCertificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCertificationId, userId: mockUserId },
      });
      expect(bucketService.deleteObject).toHaveBeenCalledWith(certification.certificatePath);
      expect(userCertificationRepository.remove).toHaveBeenCalledWith(certification);
    });

    it('removes a user certification without certificate file', async () => {
      const certification = makeMockUserCertification({ certificatePath: undefined });

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.remove.mockResolvedValue(certification);

      await service.remove(mockUserId, mockCertificationId);

      expect(userCertificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCertificationId, userId: mockUserId },
      });
      expect(bucketService.deleteObject).not.toHaveBeenCalled();
      expect(userCertificationRepository.remove).toHaveBeenCalledWith(certification);
    });

    it('throws NotFoundException when certification does not exist', async () => {
      userCertificationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockCertificationId)).rejects.toThrow(
        new NotFoundException('User certification not found.'),
      );
    });
  });

  describe('uploadCertificate', () => {
    it('uploads certificate successfully', async () => {
      const certification = makeMockUserCertification({ certificatePath: undefined });
      const newKey = 'certificate/user-1/aws-certified-solutions-architect-1234567890.pdf';

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.save.mockResolvedValue({
        ...certification,
        certificatePath: newKey,
      } as UserCertification);
      bucketService.uploadObject.mockResolvedValue();
      bucketService.getPublicUrl.mockReturnValue(`http://localhost:9000/bucket/${newKey}`);

      // Mock Date.now() for predictable filename
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const result = await service.uploadCertificate(mockUserId, mockCertificationId, mockFile);

      expect(userCertificationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCertificationId, userId: mockUserId },
      });
      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        newKey,
        mockFile.buffer,
        'application/pdf',
      );
      expect(userCertificationRepository.save).toHaveBeenCalledWith({
        ...certification,
        certificatePath: newKey,
      });
      expect(result).toEqual({
        message: 'Certificate uploaded or replaced successfully.',
        data: {
          certificateUrl: `http://localhost:9000/bucket/${newKey}`,
        },
      });

      // Restore Date.now()
      Date.now = originalDateNow;
    });

    it('replaces existing certificate', async () => {
      const certification = makeMockUserCertification();
      const newKey = 'certificate/user-1/aws-certified-solutions-architect-1234567890.pdf';

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.save.mockResolvedValue({
        ...certification,
        certificatePath: newKey,
      } as UserCertification);
      bucketService.uploadObject.mockResolvedValue();
      bucketService.deleteObject.mockResolvedValue();
      bucketService.getPublicUrl.mockReturnValue(`http://localhost:9000/bucket/${newKey}`);

      // Mock Date.now() for predictable filename
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const result = await service.uploadCertificate(mockUserId, mockCertificationId, mockFile);

      expect(bucketService.deleteObject).toHaveBeenCalledWith(mockCertificatePath);
      expect(bucketService.uploadObject).toHaveBeenCalledWith(
        newKey,
        mockFile.buffer,
        'application/pdf',
      );
      expect(result.data.certificateUrl).toBe(`http://localhost:9000/bucket/${newKey}`);

      // Restore Date.now()
      Date.now = originalDateNow;
    });

    it('throws NotFoundException when certification does not exist', async () => {
      userCertificationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadCertificate(mockUserId, mockCertificationId, mockFile),
      ).rejects.toThrow(new NotFoundException('User certification not found.'));
    });

    it('continues with upload when old certificate deletion fails', async () => {
      const certification = makeMockUserCertification();
      const newKey = 'certificate/user-1/aws-certified-solutions-architect-1234567890.pdf';
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.save.mockResolvedValue({
        ...certification,
        certificatePath: newKey,
      } as UserCertification);
      bucketService.uploadObject.mockResolvedValue();
      bucketService.deleteObject.mockRejectedValue(new Error('Delete failed'));
      bucketService.getPublicUrl.mockReturnValue(`http://localhost:9000/bucket/${newKey}`);

      // Mock Date.now() for predictable filename
      const originalDateNow = Date.now;
      Date.now = jest.fn(() => 1234567890);

      const result = await service.uploadCertificate(mockUserId, mockCertificationId, mockFile);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete old certificate file:'),
        expect.any(Error),
      );
      expect(result.data.certificateUrl).toBe(`http://localhost:9000/bucket/${newKey}`);

      // Restore
      Date.now = originalDateNow;
      consoleWarnSpy.mockRestore();
    });
  });

  describe('remove', () => {
    it('continues with removal when certificate file deletion fails', async () => {
      const certification = makeMockUserCertification();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      userCertificationRepository.findOne.mockResolvedValue(certification);
      userCertificationRepository.remove.mockResolvedValue(certification);
      bucketService.deleteObject.mockRejectedValue(new Error('Delete failed'));

      await service.remove(mockUserId, mockCertificationId);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete certificate file:'),
        expect.any(Error),
      );
      expect(userCertificationRepository.remove).toHaveBeenCalledWith(certification);

      consoleWarnSpy.mockRestore();
    });
  });
});

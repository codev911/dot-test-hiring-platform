import { UnauthorizedException } from '@nestjs/common';
import { UserCertificationController } from '../../src/user-certification/user-certification.controller';
import type { UserCertificationService } from '../../src/user-certification/user-certification.service';
import type { CreateUserCertificationDto } from '../../src/user-certification/dto/create-user-certification.dto';
import type { UpdateUserCertificationDto } from '../../src/user-certification/dto/update-user-certification.dto';
import { Month } from '../../src/utils/enums/month.enum';
import type { JwtPayload } from '../../src/utils/types/auth.type';
import type {
  UserCertificationData,
  PaginatedUserCertificationsData,
} from '../../src/utils/types/user.type';

const mockUserId = 'user-1';
const mockCertificationId = 'certification-1';

const mockJwtPayload: JwtPayload = {
  sub: mockUserId,
  email: 'user@example.com',
  role: 'candidate',
};

const mockRequest = (user?: JwtPayload) => ({
  user,
});

const mockUserCertificationData: UserCertificationData = {
  id: mockCertificationId,
  certificationName: 'AWS Certified Solutions Architect',
  issuingOrganization: 'Amazon Web Services',
  issuedMonth: Month.JANUARY,
  issuedYear: 2023,
  expiredMonth: Month.JANUARY,
  expiredYear: 2026,
  certificationId: 'AWS-SAA-C03-123456',
  certificationUrl: 'https://www.credly.com/badges/123456',
  certificateUrl: 'http://localhost:9000/bucket/certificate/user-1/aws-cert.pdf',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

const mockPaginatedData: PaginatedUserCertificationsData = {
  data: [mockUserCertificationData],
  totalData: 1,
  page: 1,
  limit: 10,
  totalPage: 1,
};

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'aws-cert.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('mock-pdf-content'),
  size: 1024,
} as Express.Multer.File;

describe('UserCertificationController', () => {
  let controller: UserCertificationController;
  let service: jest.Mocked<UserCertificationService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      uploadCertificate: jest.fn(),
    } as unknown as jest.Mocked<UserCertificationService>;

    controller = new UserCertificationController(service);
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

      service.create.mockResolvedValue(mockUserCertificationData);

      const result = await controller.create(mockRequest(mockJwtPayload) as any, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual({
        message: 'User certification created successfully.',
        data: mockUserCertificationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const createDto: CreateUserCertificationDto = {
        certificationName: 'Google Cloud Professional',
        issuingOrganization: 'Google Cloud',
        issuedYear: 2023,
      };

      await expect(controller.create(mockRequest() as any, createDto)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });

    it('throws UnauthorizedException when user sub is missing', async () => {
      const createDto: CreateUserCertificationDto = {
        certificationName: 'Google Cloud Professional',
        issuingOrganization: 'Google Cloud',
        issuedYear: 2023,
      };
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };

      await expect(
        controller.create(mockRequest(invalidPayload) as any, createDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('findAll', () => {
    it('returns paginated user certifications with default pagination', async () => {
      service.findAll.mockResolvedValue(mockPaginatedData);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result).toEqual({
        message: 'User certifications retrieved successfully.',
        data: mockPaginatedData.data,
        pagination: {
          page: mockPaginatedData.page,
          limit: mockPaginatedData.limit,
          totalData: mockPaginatedData.totalData,
          totalPage: mockPaginatedData.totalPage,
        },
      });
    });

    it('returns paginated user certifications with custom pagination', async () => {
      const customPaginatedData = {
        ...mockPaginatedData,
        page: 2,
        limit: 5,
      };
      service.findAll.mockResolvedValue(customPaginatedData);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any, 2, 5);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 2, 5);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(5);
    });

    it('normalizes page and limit parameters', async () => {
      service.findAll.mockResolvedValue(mockPaginatedData);

      // Test negative page
      await controller.findAll(mockRequest(mockJwtPayload) as any, -1, 100);
      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 50); // page normalized to 1, limit capped at 50

      // Test zero limit - it falls back to default 10
      await controller.findAll(mockRequest(mockJwtPayload) as any, 1, 0);
      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 10); // limit normalized to default 10
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findAll(mockRequest() as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('findOne', () => {
    it('returns a specific user certification', async () => {
      service.findOne.mockResolvedValue(mockUserCertificationData);

      const result = await controller.findOne(
        mockRequest(mockJwtPayload) as any,
        mockCertificationId,
      );

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockCertificationId);
      expect(result).toEqual({
        message: 'User certification retrieved successfully.',
        data: mockUserCertificationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findOne(mockRequest() as any, mockCertificationId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user certification successfully', async () => {
      const updateDto: UpdateUserCertificationDto = {
        certificationName: 'AWS Certified Solutions Architect - Professional',
        expiredYear: 2027,
      };
      const updatedCertificationData = {
        ...mockUserCertificationData,
        certificationName: 'AWS Certified Solutions Architect - Professional',
        expiredYear: 2027,
      };

      service.update.mockResolvedValue(updatedCertificationData);

      const result = await controller.update(
        mockRequest(mockJwtPayload) as any,
        mockCertificationId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(mockUserId, mockCertificationId, updateDto);
      expect(result).toEqual({
        message: 'User certification updated successfully.',
        data: updatedCertificationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const updateDto: UpdateUserCertificationDto = {
        certificationName: 'AWS Certified Solutions Architect - Professional',
      };

      await expect(
        controller.update(mockRequest() as any, mockCertificationId, updateDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('remove', () => {
    it('removes a user certification successfully', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(
        mockRequest(mockJwtPayload) as any,
        mockCertificationId,
      );

      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockCertificationId);
      expect(result).toEqual({
        message: 'User certification deleted successfully.',
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.remove(mockRequest() as any, mockCertificationId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('uploadCertificate', () => {
    it('uploads certificate successfully', async () => {
      const uploadResponse = {
        message: 'Certificate uploaded or replaced successfully.',
        data: { certificateUrl: 'http://localhost:9000/bucket/certificate/user-1/aws-cert.pdf' },
      };

      service.uploadCertificate.mockResolvedValue(uploadResponse);

      const result = await controller.uploadCertificate(
        mockRequest(mockJwtPayload) as any,
        mockCertificationId,
        mockFile,
      );

      expect(service.uploadCertificate).toHaveBeenCalledWith(
        mockUserId,
        mockCertificationId,
        mockFile,
      );
      expect(result).toEqual(uploadResponse);
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(
        controller.uploadCertificate(mockRequest() as any, mockCertificationId, mockFile),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('extractUserId', () => {
    it('extracts user ID from valid JWT payload', () => {
      const request = mockRequest(mockJwtPayload);

      // Access the private method through bracket notation for testing
      const userId = controller['extractUserId'](request as any);

      expect(userId).toBe(mockUserId);
    });

    it('throws UnauthorizedException when user is undefined', () => {
      const request = mockRequest();

      expect(() => controller['extractUserId'](request as any)).toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });

    it('throws UnauthorizedException when sub is undefined', () => {
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };
      const request = mockRequest(invalidPayload);

      expect(() => controller['extractUserId'](request as any)).toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });
});

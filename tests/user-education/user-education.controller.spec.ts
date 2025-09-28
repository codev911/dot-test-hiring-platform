import { UnauthorizedException } from '@nestjs/common';
import { UserEducationController } from '../../src/user-education/user-education.controller';
import type { UserEducationService } from '../../src/user-education/user-education.service';
import type { CreateUserEducationDto } from '../../src/user-education/dto/create-user-education.dto';
import type { UpdateUserEducationDto } from '../../src/user-education/dto/update-user-education.dto';
import { EducationLevel } from '../../src/utils/enums/education-level.enum';
import { Month } from '../../src/utils/enums/month.enum';
import type { JwtPayload } from '../../src/utils/types/auth.type';
import type {
  UserEducationData,
  PaginatedUserEducationsData,
} from '../../src/utils/types/user.type';

const mockUserId = 'user-1';
const mockEducationId = 'education-1';

const mockJwtPayload: JwtPayload = {
  sub: mockUserId,
  email: 'user@example.com',
  role: 'candidate',
};

const mockRequest = (user?: JwtPayload) => ({
  user,
});

const mockUserEducationData: UserEducationData = {
  id: mockEducationId,
  institution: 'Harvard University',
  educationLevel: EducationLevel.BACHELOR_DEGREE,
  fromMonth: Month.SEPTEMBER,
  fromYear: 2018,
  toMonth: Month.MAY,
  toYear: 2022,
  description: 'Computer Science major with focus on AI and Machine Learning',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

const mockPaginatedData: PaginatedUserEducationsData = {
  data: [mockUserEducationData],
  totalData: 1,
  page: 1,
  limit: 10,
  totalPage: 1,
};

describe('UserEducationController', () => {
  let controller: UserEducationController;
  let service: jest.Mocked<UserEducationService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UserEducationService>;

    controller = new UserEducationController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user education successfully', async () => {
      const createDto: CreateUserEducationDto = {
        institution: 'MIT',
        educationLevel: EducationLevel.MASTER_DEGREE,
        fromMonth: Month.SEPTEMBER,
        fromYear: 2020,
        toMonth: Month.JUNE,
        toYear: 2022,
        description: 'Master in Computer Science',
      };

      service.create.mockResolvedValue(mockUserEducationData);

      const result = await controller.create(mockRequest(mockJwtPayload) as any, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual({
        message: 'User education created successfully.',
        data: mockUserEducationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const createDto: CreateUserEducationDto = {
        institution: 'MIT',
        educationLevel: EducationLevel.MASTER_DEGREE,
        fromYear: 2020,
        toYear: 2022,
      };

      await expect(controller.create(mockRequest() as any, createDto)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });

    it('throws UnauthorizedException when user sub is missing', async () => {
      const createDto: CreateUserEducationDto = {
        institution: 'MIT',
        educationLevel: EducationLevel.MASTER_DEGREE,
        fromYear: 2020,
        toYear: 2022,
      };
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };

      await expect(
        controller.create(mockRequest(invalidPayload) as any, createDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('findAll', () => {
    it('returns paginated user educations with default pagination', async () => {
      service.findAll.mockResolvedValue(mockPaginatedData);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result).toEqual({
        message: 'User educations retrieved successfully.',
        data: mockPaginatedData.data,
        pagination: {
          page: mockPaginatedData.page,
          limit: mockPaginatedData.limit,
          totalData: mockPaginatedData.totalData,
          totalPage: mockPaginatedData.totalPage,
        },
      });
    });

    it('returns paginated user educations with custom pagination', async () => {
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
    it('returns a specific user education', async () => {
      service.findOne.mockResolvedValue(mockUserEducationData);

      const result = await controller.findOne(mockRequest(mockJwtPayload) as any, mockEducationId);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockEducationId);
      expect(result).toEqual({
        message: 'User education retrieved successfully.',
        data: mockUserEducationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findOne(mockRequest() as any, mockEducationId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user education successfully', async () => {
      const updateDto: UpdateUserEducationDto = {
        educationLevel: EducationLevel.DOCTORATE,
        description: 'PhD in Computer Science',
      };
      const updatedEducationData = {
        ...mockUserEducationData,
        educationLevel: EducationLevel.DOCTORATE,
        description: 'PhD in Computer Science',
      };

      service.update.mockResolvedValue(updatedEducationData);

      const result = await controller.update(
        mockRequest(mockJwtPayload) as any,
        mockEducationId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(mockUserId, mockEducationId, updateDto);
      expect(result).toEqual({
        message: 'User education updated successfully.',
        data: updatedEducationData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const updateDto: UpdateUserEducationDto = {
        educationLevel: EducationLevel.DOCTORATE,
      };

      await expect(
        controller.update(mockRequest() as any, mockEducationId, updateDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('remove', () => {
    it('removes a user education successfully', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRequest(mockJwtPayload) as any, mockEducationId);

      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockEducationId);
      expect(result).toEqual({
        message: 'User education deleted successfully.',
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.remove(mockRequest() as any, mockEducationId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
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

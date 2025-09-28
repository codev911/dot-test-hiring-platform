import { UnauthorizedException } from '@nestjs/common';
import { UserExperienceController } from '../../src/user-experience/user-experience.controller';
import type { UserExperienceService } from '../../src/user-experience/user-experience.service';
import type { CreateUserExperienceDto } from '../../src/user-experience/dto/create-user-experience.dto';
import type { UpdateUserExperienceDto } from '../../src/user-experience/dto/update-user-experience.dto';
import { JobType } from '../../src/utils/enums/job-type.enum';
import { JobLocation } from '../../src/utils/enums/job-location.enum';
import { Month } from '../../src/utils/enums/month.enum';
import type { JwtPayload } from '../../src/utils/types/auth.type';
import type {
  UserExperienceData,
  PaginatedUserExperiencesData,
} from '../../src/utils/types/user.type';

const mockUserId = 'user-1';
const mockExperienceId = 'experience-1';

const mockJwtPayload: JwtPayload = {
  sub: mockUserId,
  email: 'user@example.com',
  role: 'candidate',
};

const mockRequest = (user?: JwtPayload) => ({
  user,
});

const mockUserExperienceData: UserExperienceData = {
  id: mockExperienceId,
  title: 'Senior Software Engineer',
  company: 'Tech Corp',
  type: JobType.FULL_TIME,
  location: JobLocation.ONSITE,
  fromMonth: Month.JANUARY,
  fromYear: 2020,
  toMonth: Month.DECEMBER,
  toYear: 2023,
  description: 'Developed web applications',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

const mockPaginatedData: PaginatedUserExperiencesData = {
  data: [mockUserExperienceData],
  totalData: 1,
  page: 1,
  limit: 10,
  totalPage: 1,
};

describe('UserExperienceController', () => {
  let controller: UserExperienceController;
  let service: jest.Mocked<UserExperienceService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UserExperienceService>;

    controller = new UserExperienceController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user experience successfully', async () => {
      const createDto: CreateUserExperienceDto = {
        title: 'Senior Developer',
        company: 'Tech Company',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
        fromYear: 2021,
        description: 'Built awesome software',
      };

      service.create.mockResolvedValue(mockUserExperienceData);

      const result = await controller.create(mockRequest(mockJwtPayload) as any, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual({
        message: 'User experience created successfully.',
        data: mockUserExperienceData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const createDto: CreateUserExperienceDto = {
        title: 'Senior Developer',
        company: 'Tech Company',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
      };

      await expect(controller.create(mockRequest() as any, createDto)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });

    it('throws UnauthorizedException when user sub is missing', async () => {
      const createDto: CreateUserExperienceDto = {
        title: 'Senior Developer',
        company: 'Tech Company',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
      };
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };

      await expect(
        controller.create(mockRequest(invalidPayload) as any, createDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('findAll', () => {
    it('returns paginated user experiences with default pagination', async () => {
      service.findAll.mockResolvedValue(mockPaginatedData);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result).toEqual({
        message: 'User experiences retrieved successfully.',
        data: mockPaginatedData.data,
        pagination: {
          page: mockPaginatedData.page,
          limit: mockPaginatedData.limit,
          totalData: mockPaginatedData.totalData,
          totalPage: mockPaginatedData.totalPage,
        },
      });
    });

    it('returns paginated user experiences with custom pagination', async () => {
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
    it('returns a specific user experience', async () => {
      service.findOne.mockResolvedValue(mockUserExperienceData);

      const result = await controller.findOne(mockRequest(mockJwtPayload) as any, mockExperienceId);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockExperienceId);
      expect(result).toEqual({
        message: 'User experience retrieved successfully.',
        data: mockUserExperienceData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findOne(mockRequest() as any, mockExperienceId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user experience successfully', async () => {
      const updateDto: UpdateUserExperienceDto = {
        title: 'Lead Software Engineer',
        company: 'Updated Tech Corp',
      };
      const updatedExperienceData = {
        ...mockUserExperienceData,
        title: 'Lead Software Engineer',
        company: 'Updated Tech Corp',
      };

      service.update.mockResolvedValue(updatedExperienceData);

      const result = await controller.update(
        mockRequest(mockJwtPayload) as any,
        mockExperienceId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(mockUserId, mockExperienceId, updateDto);
      expect(result).toEqual({
        message: 'User experience updated successfully.',
        data: updatedExperienceData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const updateDto: UpdateUserExperienceDto = {
        title: 'Lead Software Engineer',
      };

      await expect(
        controller.update(mockRequest() as any, mockExperienceId, updateDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('remove', () => {
    it('removes a user experience successfully', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRequest(mockJwtPayload) as any, mockExperienceId);

      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockExperienceId);
      expect(result).toEqual({
        message: 'User experience deleted successfully.',
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.remove(mockRequest() as any, mockExperienceId)).rejects.toThrow(
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

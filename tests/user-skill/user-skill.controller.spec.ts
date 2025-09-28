import { UnauthorizedException } from '@nestjs/common';
import { UserSkillController } from '../../src/user-skill/user-skill.controller';
import type { UserSkillService } from '../../src/user-skill/user-skill.service';
import type { CreateUserSkillDto } from '../../src/user-skill/dto/create-user-skill.dto';
import type { UpdateUserSkillDto } from '../../src/user-skill/dto/update-user-skill.dto';
import { SkillProficiency } from '../../src/utils/enums/skill-proficiency.enum';
import type { JwtPayload } from '../../src/utils/types/auth.type';
import type { UserSkillData, PaginatedUserSkillsData } from '../../src/utils/types/user.type';

const mockUserId = 'user-1';
const mockSkillId = 'skill-1';

const mockJwtPayload: JwtPayload = {
  sub: mockUserId,
  email: 'user@example.com',
  role: 'candidate',
};

const mockRequest = (user?: JwtPayload) => ({
  user,
});

const mockUserSkillData: UserSkillData = {
  id: mockSkillId,
  skillName: 'JavaScript',
  proficiency: SkillProficiency.INTERMEDIATE,
  yearsExperience: 3,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-02'),
};

const mockPaginatedData: PaginatedUserSkillsData = {
  data: [mockUserSkillData],
  totalData: 1,
  page: 1,
  limit: 10,
  totalPage: 1,
};

describe('UserSkillController', () => {
  let controller: UserSkillController;
  let service: jest.Mocked<UserSkillService>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UserSkillService>;

    controller = new UserSkillController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user skill successfully', async () => {
      const createDto: CreateUserSkillDto = {
        skillName: 'TypeScript',
        proficiency: SkillProficiency.ADVANCED,
        yearsExperience: 5,
      };

      service.create.mockResolvedValue(mockUserSkillData);

      const result = await controller.create(mockRequest(mockJwtPayload) as any, createDto);

      expect(service.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(result).toEqual({
        message: 'User skill created successfully.',
        data: mockUserSkillData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const createDto: CreateUserSkillDto = {
        skillName: 'TypeScript',
        proficiency: SkillProficiency.ADVANCED,
      };

      await expect(controller.create(mockRequest() as any, createDto)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });

    it('throws UnauthorizedException when user sub is missing', async () => {
      const createDto: CreateUserSkillDto = {
        skillName: 'TypeScript',
        proficiency: SkillProficiency.ADVANCED,
      };
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };

      await expect(
        controller.create(mockRequest(invalidPayload) as any, createDto),
      ).rejects.toThrow(new UnauthorizedException('Invalid token payload.'));
    });
  });

  describe('findAll', () => {
    it('returns paginated user skills with default pagination', async () => {
      service.findAll.mockResolvedValue(mockPaginatedData);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId, 1, 10);
      expect(result).toEqual({
        message: 'User skills retrieved successfully.',
        data: mockPaginatedData.data,
        pagination: {
          page: mockPaginatedData.page,
          limit: mockPaginatedData.limit,
          totalData: mockPaginatedData.totalData,
          totalPage: mockPaginatedData.totalPage,
        },
      });
    });

    it('returns paginated user skills with custom pagination', async () => {
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
    it('returns a specific user skill', async () => {
      service.findOne.mockResolvedValue(mockUserSkillData);

      const result = await controller.findOne(mockRequest(mockJwtPayload) as any, mockSkillId);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, mockSkillId);
      expect(result).toEqual({
        message: 'User skill retrieved successfully.',
        data: mockUserSkillData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findOne(mockRequest() as any, mockSkillId)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user skill successfully', async () => {
      const updateDto: UpdateUserSkillDto = {
        proficiency: SkillProficiency.EXPERT,
        yearsExperience: 7,
      };
      const updatedSkillData = {
        ...mockUserSkillData,
        proficiency: SkillProficiency.EXPERT,
        yearsExperience: 7,
      };

      service.update.mockResolvedValue(updatedSkillData);

      const result = await controller.update(
        mockRequest(mockJwtPayload) as any,
        mockSkillId,
        updateDto,
      );

      expect(service.update).toHaveBeenCalledWith(mockUserId, mockSkillId, updateDto);
      expect(result).toEqual({
        message: 'User skill updated successfully.',
        data: updatedSkillData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      const updateDto: UpdateUserSkillDto = {
        proficiency: SkillProficiency.EXPERT,
      };

      await expect(controller.update(mockRequest() as any, mockSkillId, updateDto)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload.'),
      );
    });
  });

  describe('remove', () => {
    it('removes a user skill successfully', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRequest(mockJwtPayload) as any, mockSkillId);

      expect(service.remove).toHaveBeenCalledWith(mockUserId, mockSkillId);
      expect(result).toEqual({
        message: 'User skill deleted successfully.',
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.remove(mockRequest() as any, mockSkillId)).rejects.toThrow(
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

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserExperienceService } from '../../src/user-experience/user-experience.service';
import { UserExperience } from '../../src/entities/user-experience.entity';
import { User } from '../../src/entities/user.entity';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { JobType } from '../../src/utils/enums/job-type.enum';
import { JobLocation } from '../../src/utils/enums/job-location.enum';
import { Month } from '../../src/utils/enums/month.enum';
import type { CreateUserExperienceDto } from '../../src/user-experience/dto/create-user-experience.dto';
import type { UpdateUserExperienceDto } from '../../src/user-experience/dto/update-user-experience.dto';

const mockUserId = 'user-1';
const mockExperienceId = 'experience-1';

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

const makeMockUserExperience = (overrides: Partial<UserExperience> = {}): UserExperience => {
  const experience = new UserExperience();
  Object.assign(experience, {
    id: mockExperienceId,
    userId: mockUserId,
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
    ...overrides,
  });
  return experience;
};

describe('UserExperienceService', () => {
  let service: UserExperienceService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userExperienceRepository: jest.Mocked<Repository<UserExperience>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserExperienceService,
        {
          provide: CacheHelperService,
          useValue: {
            getOrSet: jest.fn((_k: string, s: any) => s()),
            del: jest.fn(),
            rememberList: jest.fn((_idx: string, _k: string, s: any) => s()),
            trackKey: jest.fn(),
            invalidateIndex: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserExperience),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserExperienceService>(UserExperienceService);
    userRepository = module.get(getRepositoryToken(User));
    userExperienceRepository = module.get(getRepositoryToken(UserExperience));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a new user experience successfully', async () => {
      const createDto: CreateUserExperienceDto = {
        title: 'Lead Developer',
        company: 'New Tech Corp',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
        fromYear: 2021,
        description: 'Leading development team',
      };
      const user = makeMockUser();
      const createdExperience = makeMockUserExperience({
        title: 'Lead Developer',
        company: 'New Tech Corp',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
        fromYear: 2021,
        description: 'Leading development team',
      });

      userRepository.findOne.mockResolvedValue(user);
      userExperienceRepository.create.mockReturnValue(createdExperience);
      userExperienceRepository.save.mockResolvedValue(createdExperience);

      const result = await service.create(mockUserId, createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(userExperienceRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...createDto,
      });
      expect(userExperienceRepository.save).toHaveBeenCalledWith(createdExperience);
      expect(result).toEqual({
        id: createdExperience.id,
        title: createdExperience.title,
        company: createdExperience.company,
        type: createdExperience.type,
        location: createdExperience.location,
        fromMonth: createdExperience.fromMonth,
        fromYear: createdExperience.fromYear,
        toMonth: createdExperience.toMonth,
        toYear: createdExperience.toYear,
        description: createdExperience.description,
        createdAt: createdExperience.createdAt,
        updatedAt: createdExperience.updatedAt,
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      const createDto: CreateUserExperienceDto = {
        title: 'Lead Developer',
        company: 'New Tech Corp',
        type: JobType.FULL_TIME,
        location: JobLocation.REMOTE,
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new NotFoundException('User not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated user experiences', async () => {
      const experiences = [
        makeMockUserExperience({ id: '1', title: 'Senior Developer' }),
        makeMockUserExperience({ id: '2', title: 'Lead Engineer' }),
      ];
      const total = 2;

      userExperienceRepository.findAndCount.mockResolvedValue([experiences, total]);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(userExperienceRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: experiences.map((experience) => ({
          id: experience.id,
          title: experience.title,
          company: experience.company,
          type: experience.type,
          location: experience.location,
          fromMonth: experience.fromMonth,
          fromYear: experience.fromYear,
          toMonth: experience.toMonth,
          toYear: experience.toYear,
          description: experience.description,
          createdAt: experience.createdAt,
          updatedAt: experience.updatedAt,
        })),
        totalData: total,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });

    it('calculates correct pagination for multiple pages', async () => {
      const experiences = Array.from({ length: 10 }, (_, i) =>
        makeMockUserExperience({ id: `${i + 1}` }),
      );
      const total = 25;

      userExperienceRepository.findAndCount.mockResolvedValue([experiences, total]);

      const result = await service.findAll(mockUserId, 2, 10);

      expect(userExperienceRepository.findAndCount).toHaveBeenCalledWith({
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
    it('returns a user experience by ID', async () => {
      const experience = makeMockUserExperience();

      userExperienceRepository.findOne.mockResolvedValue(experience);

      const result = await service.findOne(mockUserId, mockExperienceId);

      expect(userExperienceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockExperienceId, userId: mockUserId },
      });
      expect(result).toEqual({
        id: experience.id,
        title: experience.title,
        company: experience.company,
        type: experience.type,
        location: experience.location,
        fromMonth: experience.fromMonth,
        fromYear: experience.fromYear,
        toMonth: experience.toMonth,
        toYear: experience.toYear,
        description: experience.description,
        createdAt: experience.createdAt,
        updatedAt: experience.updatedAt,
      });
    });

    it('throws NotFoundException when experience does not exist', async () => {
      userExperienceRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockExperienceId)).rejects.toThrow(
        new NotFoundException('User experience not found.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user experience successfully', async () => {
      const updateDto: UpdateUserExperienceDto = {
        title: 'Principal Engineer',
        company: 'Updated Tech Corp',
      };
      const existingExperience = makeMockUserExperience();
      const updatedExperience = { ...existingExperience, ...updateDto };

      userExperienceRepository.findOne.mockResolvedValue(existingExperience);
      userExperienceRepository.save.mockResolvedValue(updatedExperience as UserExperience);

      const result = await service.update(mockUserId, mockExperienceId, updateDto);

      expect(userExperienceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockExperienceId, userId: mockUserId },
      });
      expect(userExperienceRepository.save).toHaveBeenCalledWith({
        ...existingExperience,
        ...updateDto,
      });
      expect(result.title).toBe('Principal Engineer');
      expect(result.company).toBe('Updated Tech Corp');
    });

    it('throws NotFoundException when experience does not exist', async () => {
      const updateDto: UpdateUserExperienceDto = {
        title: 'Principal Engineer',
      };

      userExperienceRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockUserId, mockExperienceId, updateDto)).rejects.toThrow(
        new NotFoundException('User experience not found.'),
      );
    });
  });

  describe('remove', () => {
    it('removes a user experience successfully', async () => {
      const experience = makeMockUserExperience();

      userExperienceRepository.findOne.mockResolvedValue(experience);
      userExperienceRepository.remove.mockResolvedValue(experience);

      await service.remove(mockUserId, mockExperienceId);

      expect(userExperienceRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockExperienceId, userId: mockUserId },
      });
      expect(userExperienceRepository.remove).toHaveBeenCalledWith(experience);
    });

    it('throws NotFoundException when experience does not exist', async () => {
      userExperienceRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockExperienceId)).rejects.toThrow(
        new NotFoundException('User experience not found.'),
      );
    });
  });
});

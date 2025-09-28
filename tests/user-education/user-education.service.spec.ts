import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository, DataSource, EntityManager } from 'typeorm';
import { UserEducationService } from '../../src/user-education/user-education.service';
import { UserEducation } from '../../src/entities/user-education.entity';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { User } from '../../src/entities/user.entity';
import { EducationLevel } from '../../src/utils/enums/education-level.enum';
import { Month } from '../../src/utils/enums/month.enum';
import type { CreateUserEducationDto } from '../../src/user-education/dto/create-user-education.dto';
import type { UpdateUserEducationDto } from '../../src/user-education/dto/update-user-education.dto';

const mockUserId = 'user-1';
const mockEducationId = 'education-1';

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

const makeMockUserEducation = (overrides: Partial<UserEducation> = {}): UserEducation => {
  const education = new UserEducation();
  Object.assign(education, {
    id: mockEducationId,
    userId: mockUserId,
    institution: 'Harvard University',
    educationLevel: EducationLevel.BACHELOR_DEGREE,
    fromMonth: Month.SEPTEMBER,
    fromYear: 2018,
    toMonth: Month.MAY,
    toYear: 2022,
    description: 'Computer Science major with focus on AI and Machine Learning',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    ...overrides,
  });
  return education;
};

describe('UserEducationService', () => {
  let service: UserEducationService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userEducationRepository: jest.Mocked<Repository<UserEducation>>;
  let dataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserEducationService,
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
          provide: getRepositoryToken(UserEducation),
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

    service = module.get<UserEducationService>(UserEducationService);
    userRepository = module.get(getRepositoryToken(User));
    userEducationRepository = module.get(getRepositoryToken(UserEducation));
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
      const user = makeMockUser();
      const createdEducation = makeMockUserEducation({
        institution: 'MIT',
        educationLevel: EducationLevel.MASTER_DEGREE,
        fromMonth: Month.SEPTEMBER,
        fromYear: 2020,
        toMonth: Month.JUNE,
        toYear: 2022,
        description: 'Master in Computer Science',
      });

      userRepository.findOne.mockResolvedValue(user);
      userEducationRepository.create.mockReturnValue(createdEducation);
      userEducationRepository.save.mockResolvedValue(createdEducation);

      const result = await service.create(mockUserId, createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(userEducationRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...createDto,
      });
      expect(userEducationRepository.save).toHaveBeenCalledWith(createdEducation);
      expect(result).toEqual({
        id: createdEducation.id,
        institution: createdEducation.institution,
        educationLevel: createdEducation.educationLevel,
        fromMonth: createdEducation.fromMonth,
        fromYear: createdEducation.fromYear,
        toMonth: createdEducation.toMonth,
        toYear: createdEducation.toYear,
        description: createdEducation.description,
        createdAt: createdEducation.createdAt,
        updatedAt: createdEducation.updatedAt,
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      const createDto: CreateUserEducationDto = {
        institution: 'MIT',
        educationLevel: EducationLevel.MASTER_DEGREE,
        fromYear: 2020,
        toYear: 2022,
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new NotFoundException('User not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated user educations', async () => {
      const educations = [
        makeMockUserEducation({ id: '1', institution: 'Harvard University' }),
        makeMockUserEducation({ id: '2', institution: 'MIT' }),
      ];
      const total = 2;

      userEducationRepository.findAndCount.mockResolvedValue([educations, total]);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(userEducationRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: educations.map((education) => ({
          id: education.id,
          institution: education.institution,
          educationLevel: education.educationLevel,
          fromMonth: education.fromMonth,
          fromYear: education.fromYear,
          toMonth: education.toMonth,
          toYear: education.toYear,
          description: education.description,
          createdAt: education.createdAt,
          updatedAt: education.updatedAt,
        })),
        totalData: total,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });

    it('calculates correct pagination for multiple pages', async () => {
      const educations = Array.from({ length: 10 }, (_, i) =>
        makeMockUserEducation({ id: `${i + 1}` }),
      );
      const total = 25;

      userEducationRepository.findAndCount.mockResolvedValue([educations, total]);

      const result = await service.findAll(mockUserId, 2, 10);

      expect(userEducationRepository.findAndCount).toHaveBeenCalledWith({
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
    it('returns a user education by ID', async () => {
      const education = makeMockUserEducation();

      userEducationRepository.findOne.mockResolvedValue(education);

      const result = await service.findOne(mockUserId, mockEducationId);

      expect(userEducationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEducationId, userId: mockUserId },
      });
      expect(result).toEqual({
        id: education.id,
        institution: education.institution,
        educationLevel: education.educationLevel,
        fromMonth: education.fromMonth,
        fromYear: education.fromYear,
        toMonth: education.toMonth,
        toYear: education.toYear,
        description: education.description,
        createdAt: education.createdAt,
        updatedAt: education.updatedAt,
      });
    });

    it('throws NotFoundException when education does not exist', async () => {
      userEducationRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockEducationId)).rejects.toThrow(
        new NotFoundException('User education not found.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user education successfully', async () => {
      const updateDto: UpdateUserEducationDto = {
        educationLevel: EducationLevel.DOCTORATE,
        description: 'PhD in Computer Science',
      };
      const existingEducation = makeMockUserEducation();
      const updatedEducation = { ...existingEducation, ...updateDto };

      userEducationRepository.findOne.mockResolvedValue(existingEducation);
      userEducationRepository.save.mockResolvedValue(updatedEducation as UserEducation);

      const result = await service.update(mockUserId, mockEducationId, updateDto);

      expect(userEducationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEducationId, userId: mockUserId },
      });
      expect(userEducationRepository.save).toHaveBeenCalledWith({
        ...existingEducation,
        ...updateDto,
      });
      expect(result.educationLevel).toBe(EducationLevel.DOCTORATE);
      expect(result.description).toBe('PhD in Computer Science');
    });

    it('throws NotFoundException when education does not exist', async () => {
      const updateDto: UpdateUserEducationDto = {
        educationLevel: EducationLevel.DOCTORATE,
      };

      userEducationRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockUserId, mockEducationId, updateDto)).rejects.toThrow(
        new NotFoundException('User education not found.'),
      );
    });
  });

  describe('remove', () => {
    it('removes a user education successfully', async () => {
      const education = makeMockUserEducation();

      userEducationRepository.findOne.mockResolvedValue(education);
      userEducationRepository.remove.mockResolvedValue(education);

      await service.remove(mockUserId, mockEducationId);

      expect(userEducationRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockEducationId, userId: mockUserId },
      });
      expect(userEducationRepository.remove).toHaveBeenCalledWith(education);
    });

    it('throws NotFoundException when education does not exist', async () => {
      userEducationRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockEducationId)).rejects.toThrow(
        new NotFoundException('User education not found.'),
      );
    });
  });
});

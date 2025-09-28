import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { UserSkillService } from '../../src/user-skill/user-skill.service';
import { UserSkill } from '../../src/entities/user-skill.entity';
import { User } from '../../src/entities/user.entity';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { SkillProficiency } from '../../src/utils/enums/skill-proficiency.enum';
import type { CreateUserSkillDto } from '../../src/user-skill/dto/create-user-skill.dto';
import type { UpdateUserSkillDto } from '../../src/user-skill/dto/update-user-skill.dto';

const mockUserId = 'user-1';
const mockSkillId = 'skill-1';

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

const makeMockUserSkill = (overrides: Partial<UserSkill> = {}): UserSkill => {
  const skill = new UserSkill();
  Object.assign(skill, {
    id: mockSkillId,
    userId: mockUserId,
    skillName: 'JavaScript',
    proficiency: SkillProficiency.INTERMEDIATE,
    yearsExperience: 3,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-02'),
    ...overrides,
  });
  return skill;
};

describe('UserSkillService', () => {
  let service: UserSkillService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userSkillRepository: jest.Mocked<Repository<UserSkill>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSkillService,
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
          provide: getRepositoryToken(UserSkill),
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

    service = module.get<UserSkillService>(UserSkillService);
    userRepository = module.get(getRepositoryToken(User));
    userSkillRepository = module.get(getRepositoryToken(UserSkill));
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
      const user = makeMockUser();
      const createdSkill = makeMockUserSkill({
        skillName: 'TypeScript',
        proficiency: SkillProficiency.ADVANCED,
        yearsExperience: 5,
      });

      userRepository.findOne.mockResolvedValue(user);
      userSkillRepository.create.mockReturnValue(createdSkill);
      userSkillRepository.save.mockResolvedValue(createdSkill);

      const result = await service.create(mockUserId, createDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: mockUserId } });
      expect(userSkillRepository.create).toHaveBeenCalledWith({
        userId: mockUserId,
        ...createDto,
      });
      expect(userSkillRepository.save).toHaveBeenCalledWith(createdSkill);
      expect(result).toEqual({
        id: createdSkill.id,
        skillName: createdSkill.skillName,
        proficiency: createdSkill.proficiency,
        yearsExperience: createdSkill.yearsExperience,
        createdAt: createdSkill.createdAt,
        updatedAt: createdSkill.updatedAt,
      });
    });

    it('throws NotFoundException when user does not exist', async () => {
      const createDto: CreateUserSkillDto = {
        skillName: 'TypeScript',
        proficiency: SkillProficiency.ADVANCED,
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        new NotFoundException('User not found.'),
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated user skills', async () => {
      const skills = [
        makeMockUserSkill({ id: '1', skillName: 'JavaScript' }),
        makeMockUserSkill({ id: '2', skillName: 'TypeScript' }),
      ];
      const total = 2;

      userSkillRepository.findAndCount.mockResolvedValue([skills, total]);

      const result = await service.findAll(mockUserId, 1, 10);

      expect(userSkillRepository.findAndCount).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: skills.map((skill) => ({
          id: skill.id,
          skillName: skill.skillName,
          proficiency: skill.proficiency,
          yearsExperience: skill.yearsExperience,
          createdAt: skill.createdAt,
          updatedAt: skill.updatedAt,
        })),
        totalData: total,
        page: 1,
        limit: 10,
        totalPage: 1,
      });
    });

    it('calculates correct pagination for multiple pages', async () => {
      const skills = Array.from({ length: 10 }, (_, i) => makeMockUserSkill({ id: `${i + 1}` }));
      const total = 25;

      userSkillRepository.findAndCount.mockResolvedValue([skills, total]);

      const result = await service.findAll(mockUserId, 2, 10);

      expect(userSkillRepository.findAndCount).toHaveBeenCalledWith({
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
    it('returns a user skill by ID', async () => {
      const skill = makeMockUserSkill();

      userSkillRepository.findOne.mockResolvedValue(skill);

      const result = await service.findOne(mockUserId, mockSkillId);

      expect(userSkillRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSkillId, userId: mockUserId },
      });
      expect(result).toEqual({
        id: skill.id,
        skillName: skill.skillName,
        proficiency: skill.proficiency,
        yearsExperience: skill.yearsExperience,
        createdAt: skill.createdAt,
        updatedAt: skill.updatedAt,
      });
    });

    it('throws NotFoundException when skill does not exist', async () => {
      userSkillRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockUserId, mockSkillId)).rejects.toThrow(
        new NotFoundException('User skill not found.'),
      );
    });
  });

  describe('update', () => {
    it('updates a user skill successfully', async () => {
      const updateDto: UpdateUserSkillDto = {
        proficiency: SkillProficiency.EXPERT,
        yearsExperience: 7,
      };
      const existingSkill = makeMockUserSkill();
      const updatedSkill = { ...existingSkill, ...updateDto };

      userSkillRepository.findOne.mockResolvedValue(existingSkill);
      userSkillRepository.save.mockResolvedValue(updatedSkill as UserSkill);

      const result = await service.update(mockUserId, mockSkillId, updateDto);

      expect(userSkillRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSkillId, userId: mockUserId },
      });
      expect(userSkillRepository.save).toHaveBeenCalledWith({
        ...existingSkill,
        ...updateDto,
      });
      expect(result.proficiency).toBe(SkillProficiency.EXPERT);
      expect(result.yearsExperience).toBe(7);
    });

    it('throws NotFoundException when skill does not exist', async () => {
      const updateDto: UpdateUserSkillDto = {
        proficiency: SkillProficiency.EXPERT,
      };

      userSkillRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockUserId, mockSkillId, updateDto)).rejects.toThrow(
        new NotFoundException('User skill not found.'),
      );
    });
  });

  describe('remove', () => {
    it('removes a user skill successfully', async () => {
      const skill = makeMockUserSkill();

      userSkillRepository.findOne.mockResolvedValue(skill);
      userSkillRepository.remove.mockResolvedValue(skill);

      await service.remove(mockUserId, mockSkillId);

      expect(userSkillRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockSkillId, userId: mockUserId },
      });
      expect(userSkillRepository.remove).toHaveBeenCalledWith(skill);
    });

    it('throws NotFoundException when skill does not exist', async () => {
      userSkillRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockSkillId)).rejects.toThrow(
        new NotFoundException('User skill not found.'),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CompanyService } from '../../src/company/company.service';
import { Company } from '../../src/entities/company.entity';
import { User } from '../../src/entities/user.entity';
import { CompanyRecruiter } from '../../src/entities/company-recruiter.entity';
import { RecuiterLevel } from '../../src/utils/enums/recuiter-level.enum';
import type { UpdateCompanyDto } from '../../src/company/dto/update-company.dto';
import type { CreateRecruiterDto } from '../../src/company/dto/create-recruiter.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CacheHelperService } from '../../src/utils/cache/cache.service';

describe('CompanyService', () => {
  let service: CompanyService;
  let companyRepository: jest.Mocked<Repository<Company>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let companyRecruiterRepository: jest.Mocked<Repository<CompanyRecruiter>>;

  const makeCompany = (overrides: Partial<Company> = {}): Company => {
    const c = new Company();
    Object.assign(c, {
      id: '1',
      name: 'Awesome Corp',
      website: 'https://awesome.example.com',
      logoPath: '/logos/awesome.png',
      description: 'We build awesome things.',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
      ...overrides,
    });
    return c;
  };

  const makeUser = (overrides: Partial<User> = {}): User => {
    const u = new User();
    Object.assign(u, {
      id: 'user-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: 'Secret123!',
      ...overrides,
    });
    return u;
  };

  const makeMapping = (overrides: Partial<CompanyRecruiter> = {}): CompanyRecruiter => {
    const m = new CompanyRecruiter();
    Object.assign(m, {
      id: 'map-1',
      companyId: '1',
      recruiterId: 'user-1',
      recuiterLevel: RecuiterLevel.MANAGER,
      is_active: true,
      ...overrides,
    });
    return m;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        {
          provide: CacheHelperService,
          useValue: {
            getOrSet: jest.fn((_k: string, supplier: any) => supplier()),
            del: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Company),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CompanyRecruiter),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CompanyService);
    companyRepository = module.get(getRepositoryToken(Company));
    userRepository = module.get(getRepositoryToken(User));
    companyRecruiterRepository = module.get(getRepositoryToken(CompanyRecruiter));
  });

  afterEach(() => jest.clearAllMocks());

  describe('getStaticCompany', () => {
    it('returns company data when found', async () => {
      const entity = makeCompany();
      companyRepository.findOne.mockResolvedValue(entity);

      const result = await service.getStaticCompany();

      expect(companyRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(result).toEqual({
        id: entity.id,
        name: entity.name,
        website: entity.website,
        logoPath: entity.logoPath,
        description: entity.description,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });

    it('throws NotFound when missing', async () => {
      companyRepository.findOne.mockResolvedValue(null as any);
      await expect(service.getStaticCompany()).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateStaticCompany', () => {
    it('updates and returns company', async () => {
      const entity = makeCompany();
      companyRepository.findOne.mockResolvedValue(entity);
      const saved = makeCompany({ name: 'New Name' });
      companyRepository.save.mockResolvedValue(saved);

      const dto: UpdateCompanyDto = { name: 'New Name' };
      const result = await service.updateStaticCompany(dto);

      expect(companyRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(companyRepository.save).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('updates website, logoPath, and description', async () => {
      const entity = makeCompany();
      companyRepository.findOne.mockResolvedValue(entity);
      const saved = makeCompany({
        website: 'https://new.example.com',
        logoPath: '/logos/new.png',
        description: 'New desc',
      });
      companyRepository.save.mockResolvedValue(saved);

      const dto: UpdateCompanyDto = {
        website: 'https://new.example.com',
        logoPath: '/logos/new.png',
        description: 'New desc',
      };

      const result = await service.updateStaticCompany(dto);

      expect(companyRepository.save).toHaveBeenCalled();
      expect(result.website).toBe('https://new.example.com');
      expect(result.logoPath).toBe('/logos/new.png');
      expect(result.description).toBe('New desc');
    });

    it('throws NotFound when missing', async () => {
      companyRepository.findOne.mockResolvedValue(null as any);
      await expect(service.updateStaticCompany({ name: 'X' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('saves without changes when dto is empty', async () => {
      const entity = makeCompany();
      companyRepository.findOne.mockResolvedValue(entity);
      companyRepository.save.mockResolvedValue(entity);

      const result = await service.updateStaticCompany({});

      expect(companyRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(companyRepository.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual({
        id: entity.id,
        name: entity.name,
        website: entity.website,
        logoPath: entity.logoPath,
        description: entity.description,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
      });
    });
  });

  describe('createRecruiter', () => {
    it('creates user and recruiter mapping', async () => {
      const company = makeCompany();
      companyRepository.findOne.mockResolvedValue(company);
      userRepository.findOne.mockResolvedValue(null as any);

      const createdUser = makeUser({ id: 'u-10', email: 'rec@ex.com' });
      userRepository.create.mockReturnValue(createdUser);
      userRepository.save.mockResolvedValue(createdUser);

      const createdMap = makeMapping({ id: 'map-10', recruiterId: createdUser.id });
      companyRecruiterRepository.create.mockReturnValue(createdMap);
      companyRecruiterRepository.save.mockResolvedValue(createdMap);

      const dto: CreateRecruiterDto = {
        firstName: 'Rick',
        lastName: 'Rito',
        email: 'rec@ex.com',
        password: 'Secret123',
        confirmPassword: 'Secret123',
      };

      const result = await service.createRecruiter(dto);

      expect(userRepository.create).toHaveBeenCalled();
      expect(companyRecruiterRepository.create).toHaveBeenCalledWith({
        companyId: company.id,
        recruiterId: createdUser.id,
        recuiterLevel: RecuiterLevel.MANAGER,
        is_active: true,
      });
      expect(result).toEqual({
        userId: createdUser.id,
        companyRecruiterId: createdMap.id,
        email: createdUser.email,
        recuiterLevel: RecuiterLevel.MANAGER,
        companyId: company.id,
      });
    });

    it('throws NotFound when company missing', async () => {
      companyRepository.findOne.mockResolvedValue(null as any);
      const dto: CreateRecruiterDto = {
        firstName: 'A',
        email: 'a@a.com',
        password: 'x12345',
        confirmPassword: 'x12345',
      } as any;
      await expect(service.createRecruiter(dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Conflict when email exists', async () => {
      companyRepository.findOne.mockResolvedValue(makeCompany());
      userRepository.findOne.mockResolvedValue(makeUser());
      const dto: CreateRecruiterDto = {
        firstName: 'A',
        email: 'john@example.com',
        password: 'x12345',
        confirmPassword: 'x12345',
      } as any;
      await expect(service.createRecruiter(dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws Conflict when password confirm mismatch', async () => {
      companyRepository.findOne.mockResolvedValue(makeCompany());
      userRepository.findOne.mockResolvedValue(null as any);
      const dto: CreateRecruiterDto = {
        firstName: 'A',
        email: 'new@example.com',
        password: 'abc123',
        confirmPassword: 'mismatch',
      } as any;
      await expect(service.createRecruiter(dto)).rejects.toBeInstanceOf(ConflictException);
    });
  });
});

import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { UserSitesService } from '../../src/user-sites/user-sites.service';
import { UserSites } from '../../src/entities/user-sites.entity';
import { User } from '../../src/entities/user.entity';
import { CacheHelperService } from '../../src/utils/cache/cache.service';
import { UserWebsite } from '../../src/utils/enums/user-website.enum';
import { UpsertUserSiteDto } from '../../src/user-sites/dto/upsert-user-site.dto';
import type { UserSiteData } from '../../src/utils/types/user.type';

const mockUserId = '1';

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

const makeMockUserSite = (overrides: Partial<UserSites> = {}): UserSites => {
  const site = new UserSites();
  Object.assign(site, {
    id: '1',
    userId: mockUserId,
    siteType: UserWebsite.PORTOFOLIO,
    url: 'https://portfolio.example.com',
    createdAt: new Date('2024-01-15T08:30:00.000Z'),
    updatedAt: new Date('2024-01-15T08:30:00.000Z'),
    ...overrides,
  });
  return site;
};

describe('UserSitesService', () => {
  let service: UserSitesService;
  let userRepository: jest.Mocked<Repository<User>>;
  let userSitesRepository: jest.Mocked<Repository<UserSites>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSitesService,
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
          provide: getRepositoryToken(UserSites),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserSitesService>(UserSitesService);
    userRepository = module.get(getRepositoryToken(User));
    userSitesRepository = module.get(getRepositoryToken(UserSites));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upsert', () => {
    const upsertDto: UpsertUserSiteDto = {
      siteType: UserWebsite.PORTOFOLIO,
      url: 'https://portfolio.example.com',
    };

    it('should create a new site when none exists', async () => {
      const user = makeMockUser();
      const site = makeMockUserSite();

      userRepository.findOne.mockResolvedValue(user);
      userSitesRepository.findOne.mockResolvedValue(null);
      userSitesRepository.create.mockReturnValue(site);
      userSitesRepository.save.mockResolvedValue(site);

      const result = await service.upsert(user.id, upsertDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: upsertDto.siteType },
      });
      expect(userSitesRepository.create).toHaveBeenCalledWith({
        userId: user.id,
        siteType: upsertDto.siteType,
        url: upsertDto.url,
      });
      expect(userSitesRepository.save).toHaveBeenCalledWith(site);
      expect(result).toEqual({
        id: site.id,
        siteType: site.siteType,
        url: site.url,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      });
    });

    it('should update existing site when one exists', async () => {
      const updatedUrl = 'https://updated-portfolio.example.com';
      const updatedDto: UpsertUserSiteDto = {
        siteType: UserWebsite.PORTOFOLIO,
        url: updatedUrl,
      };
      const user = makeMockUser();
      const existingSite = makeMockUserSite();
      const updatedSite = makeMockUserSite({ url: updatedUrl });

      userRepository.findOne.mockResolvedValue(user);
      userSitesRepository.findOne.mockResolvedValue(existingSite);
      userSitesRepository.save.mockResolvedValue(updatedSite);

      const result = await service.upsert(user.id, updatedDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: updatedDto.siteType },
      });
      expect(userSitesRepository.save).toHaveBeenCalledWith({
        ...existingSite,
        url: updatedUrl,
      });
      expect(result.url).toBe(updatedUrl);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      const user = makeMockUser();
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.upsert(user.id, upsertDto)).rejects.toThrow(
        new NotFoundException('User not found.'),
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(userSitesRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all user sites', async () => {
      const user = makeMockUser();
      const sites = [makeMockUserSite()];
      userSitesRepository.find.mockResolvedValue(sites);

      const result = await service.findAll(user.id);

      expect(userSitesRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: sites[0].id,
        siteType: sites[0].siteType,
        url: sites[0].url,
        createdAt: sites[0].createdAt,
        updatedAt: sites[0].updatedAt,
      });
    });

    it('should return empty array when user has no sites', async () => {
      const user = makeMockUser();
      userSitesRepository.find.mockResolvedValue([]);

      const result = await service.findAll(user.id);

      expect(userSitesRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id },
        order: { createdAt: 'DESC' },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('findBySiteType', () => {
    it('should return user site by type', async () => {
      const user = makeMockUser();
      const site = makeMockUserSite();
      userSitesRepository.findOne.mockResolvedValue(site);

      const result = await service.findBySiteType(user.id, UserWebsite.PORTOFOLIO);

      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: UserWebsite.PORTOFOLIO },
      });
      expect(result).toEqual({
        id: site.id,
        siteType: site.siteType,
        url: site.url,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      });
    });

    it('should throw NotFoundException when site does not exist', async () => {
      const user = makeMockUser();
      userSitesRepository.findOne.mockResolvedValue(null);

      await expect(service.findBySiteType(user.id, UserWebsite.PORTOFOLIO)).rejects.toThrow(
        new NotFoundException('User site not found.'),
      );

      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: UserWebsite.PORTOFOLIO },
      });
    });
  });

  describe('remove', () => {
    it('should remove user site successfully', async () => {
      const user = makeMockUser();
      const site = makeMockUserSite();
      userSitesRepository.findOne.mockResolvedValue(site);
      userSitesRepository.remove.mockResolvedValue(site);

      await service.remove(user.id, UserWebsite.PORTOFOLIO);

      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: UserWebsite.PORTOFOLIO },
      });
      expect(userSitesRepository.remove).toHaveBeenCalledWith(site);
    });

    it('should throw NotFoundException when site does not exist', async () => {
      const user = makeMockUser();
      userSitesRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(user.id, UserWebsite.PORTOFOLIO)).rejects.toThrow(
        new NotFoundException('User site not found.'),
      );

      expect(userSitesRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, siteType: UserWebsite.PORTOFOLIO },
      });
      expect(userSitesRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('mapToUserSiteData', () => {
    it('should map UserSites entity to UserSiteData', () => {
      const site = makeMockUserSite();
      // Access private method for testing
      const result = (service as any).mapToUserSiteData(site);

      expect(result).toEqual({
        id: site.id,
        siteType: site.siteType,
        url: site.url,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      });
    });
  });
});

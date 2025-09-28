import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { UserSitesController } from '../../src/user-sites/user-sites.controller';
import type { UserSitesService } from '../../src/user-sites/user-sites.service';
import { UserWebsite } from '../../src/utils/enums/user-website.enum';
import { UpsertUserSiteDto } from '../../src/user-sites/dto/upsert-user-site.dto';
import type { UserSiteData } from '../../src/utils/types/user.type';
import type { JwtPayload } from '../../src/utils/types/auth.type';

describe('UserSitesController', () => {
  let controller: UserSitesController;
  let service: jest.Mocked<UserSitesService>;

  const mockUserId = '1';

  const mockJwtPayload: JwtPayload = {
    sub: mockUserId,
    email: 'user@example.com',
    role: 'candidate',
  };

  const mockRequest = (user?: JwtPayload) => ({
    user,
  });

  const mockUserSiteData: UserSiteData = {
    id: '1',
    siteType: UserWebsite.PORTOFOLIO,
    url: 'https://portfolio.example.com',
    createdAt: new Date('2024-01-15T08:30:00.000Z'),
    updatedAt: new Date('2024-01-15T08:30:00.000Z'),
  };

  beforeEach(() => {
    service = {
      upsert: jest.fn(),
      findAll: jest.fn(),
      findBySiteType: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<UserSitesService>;

    controller = new UserSitesController(service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('upsert', () => {
    const upsertDto: UpsertUserSiteDto = {
      siteType: UserWebsite.PORTOFOLIO,
      url: 'https://portfolio.example.com',
    };

    it('should upsert site successfully', async () => {
      service.upsert.mockResolvedValue(mockUserSiteData);

      const result = await controller.upsert(mockRequest(mockJwtPayload) as any, upsertDto);

      expect(service.upsert).toHaveBeenCalledWith(mockUserId, upsertDto);
      expect(result).toEqual({
        message: 'Site upserted successfully.',
        data: mockUserSiteData,
      });
    });

    it('should handle NotFoundException from service', async () => {
      service.upsert.mockRejectedValue(new NotFoundException('User not found.'));

      await expect(
        controller.upsert(mockRequest(mockJwtPayload) as any, upsertDto),
      ).rejects.toThrow(new NotFoundException('User not found.'));

      expect(service.upsert).toHaveBeenCalledWith(mockUserId, upsertDto);
    });

    it('should create new site for first-time user', async () => {
      const newSiteData = { ...mockUserSiteData, id: '2' };
      service.upsert.mockResolvedValue(newSiteData);

      const result = await controller.upsert(mockRequest(mockJwtPayload) as any, upsertDto);

      expect(service.upsert).toHaveBeenCalledWith(mockUserId, upsertDto);
      expect(result).toEqual({
        message: 'Site upserted successfully.',
        data: newSiteData,
      });
    });

    it('should update existing site', async () => {
      const updatedUrl = 'https://updated-portfolio.example.com';
      const updateDto: UpsertUserSiteDto = {
        siteType: UserWebsite.PORTOFOLIO,
        url: updatedUrl,
      };
      const updatedSiteData = { ...mockUserSiteData, url: updatedUrl };
      service.upsert.mockResolvedValue(updatedSiteData);

      const result = await controller.upsert(mockRequest(mockJwtPayload) as any, updateDto);

      expect(service.upsert).toHaveBeenCalledWith(mockUserId, updateDto);
      expect(result).toEqual({
        message: 'Site upserted successfully.',
        data: updatedSiteData,
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.upsert(mockRequest() as any, upsertDto)).rejects.toThrow(
        new UnauthorizedException('User information not found.'),
      );
    });

    it('throws UnauthorizedException when user sub is missing', async () => {
      const invalidPayload = { ...mockJwtPayload, sub: undefined as any };
      await expect(
        controller.upsert(mockRequest(invalidPayload) as any, upsertDto),
      ).rejects.toThrow(new UnauthorizedException('User information not found.'));
    });
  });

  describe('findAll', () => {
    it('should return all user sites', async () => {
      const mockSites = [mockUserSiteData];
      service.findAll.mockResolvedValue(mockSites);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        message: 'Sites retrieved successfully.',
        data: mockSites,
      });
    });

    it('should return empty array when user has no sites', async () => {
      service.findAll.mockResolvedValue([]);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual({
        message: 'Sites retrieved successfully.',
        data: [],
      });
    });

    it('should handle multiple site types', async () => {
      const mockMultipleSites = [
        mockUserSiteData,
        {
          ...mockUserSiteData,
          id: '2',
          siteType: UserWebsite.LINKEDIN,
          url: 'https://linkedin.com/in/testuser',
        },
      ];
      service.findAll.mockResolvedValue(mockMultipleSites);

      const result = await controller.findAll(mockRequest(mockJwtPayload) as any);

      expect(service.findAll).toHaveBeenCalledWith(mockUserId);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].siteType).toBe(UserWebsite.PORTOFOLIO);
      expect(result.data[1].siteType).toBe(UserWebsite.LINKEDIN);
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.findAll(mockRequest() as any)).rejects.toThrow(
        new UnauthorizedException('User information not found.'),
      );
    });
  });

  describe('findBySiteType', () => {
    it('should return site by type', async () => {
      service.findBySiteType.mockResolvedValue(mockUserSiteData);

      const result = await controller.findBySiteType(
        mockRequest(mockJwtPayload) as any,
        UserWebsite.PORTOFOLIO,
      );

      expect(service.findBySiteType).toHaveBeenCalledWith(mockUserId, UserWebsite.PORTOFOLIO);
      expect(result).toEqual({
        message: 'Site retrieved successfully.',
        data: mockUserSiteData,
      });
    });

    it('should handle NotFoundException when site not found', async () => {
      service.findBySiteType.mockRejectedValue(new NotFoundException('User site not found.'));

      await expect(
        controller.findBySiteType(mockRequest(mockJwtPayload) as any, UserWebsite.PORTOFOLIO),
      ).rejects.toThrow(new NotFoundException('User site not found.'));

      expect(service.findBySiteType).toHaveBeenCalledWith(mockUserId, UserWebsite.PORTOFOLIO);
    });

    it('should work with different site types', async () => {
      const linkedinSite = {
        ...mockUserSiteData,
        siteType: UserWebsite.LINKEDIN,
        url: 'https://linkedin.com/in/testuser',
      };
      service.findBySiteType.mockResolvedValue(linkedinSite);

      const result = await controller.findBySiteType(
        mockRequest(mockJwtPayload) as any,
        UserWebsite.LINKEDIN,
      );

      expect(service.findBySiteType).toHaveBeenCalledWith(mockUserId, UserWebsite.LINKEDIN);
      expect(result.data.siteType).toBe(UserWebsite.LINKEDIN);
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(
        controller.findBySiteType(mockRequest() as any, UserWebsite.PORTOFOLIO),
      ).rejects.toThrow(new UnauthorizedException('User information not found.'));
    });
  });

  describe('remove', () => {
    it('should remove site successfully', async () => {
      service.remove.mockResolvedValue();

      const result = await controller.remove(
        mockRequest(mockJwtPayload) as any,
        UserWebsite.PORTOFOLIO,
      );

      expect(service.remove).toHaveBeenCalledWith(mockUserId, UserWebsite.PORTOFOLIO);
      expect(result).toEqual({
        message: 'Site deleted successfully.',
      });
    });

    it('should handle NotFoundException when site not found', async () => {
      service.remove.mockRejectedValue(new NotFoundException('User site not found.'));

      await expect(
        controller.remove(mockRequest(mockJwtPayload) as any, UserWebsite.PORTOFOLIO),
      ).rejects.toThrow(new NotFoundException('User site not found.'));

      expect(service.remove).toHaveBeenCalledWith(mockUserId, UserWebsite.PORTOFOLIO);
    });

    it('should work with different site types', async () => {
      service.remove.mockResolvedValue();

      const result = await controller.remove(
        mockRequest(mockJwtPayload) as any,
        UserWebsite.GITHUB,
      );

      expect(service.remove).toHaveBeenCalledWith(mockUserId, UserWebsite.GITHUB);
      expect(result).toEqual({
        message: 'Site deleted successfully.',
      });
    });

    it('throws UnauthorizedException when user payload is missing', async () => {
      await expect(controller.remove(mockRequest() as any, UserWebsite.PORTOFOLIO)).rejects.toThrow(
        new UnauthorizedException('User information not found.'),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle invalid site type gracefully', async () => {
      // This would be caught by validation pipe in actual usage
      const invalidSiteType = 'INVALID_TYPE' as UserWebsite;
      service.findBySiteType.mockRejectedValue(new NotFoundException('User site not found.'));

      await expect(
        controller.findBySiteType(mockRequest(mockJwtPayload) as any, invalidSiteType),
      ).rejects.toThrow(new NotFoundException('User site not found.'));
    });

    it('should handle service errors appropriately', async () => {
      const serviceError = new Error('Database connection failed');
      service.upsert.mockRejectedValue(serviceError);

      const upsertDto: UpsertUserSiteDto = {
        siteType: UserWebsite.PORTOFOLIO,
        url: 'https://portfolio.example.com',
      };

      await expect(
        controller.upsert(mockRequest(mockJwtPayload) as any, upsertDto),
      ).rejects.toThrow(serviceError);
    });
  });
});

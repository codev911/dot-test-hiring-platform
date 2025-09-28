import { CompanyController } from '../../src/company/company.controller';
import type { CompanyService } from '../../src/company/company.service';
import type { CompanyData, RecruiterCreationData } from '../../src/utils/types/company.type';
import { RecuiterLevel } from '../../src/utils/enums/recuiter-level.enum';

describe('CompanyController', () => {
  let controller: CompanyController;
  let service: jest.Mocked<CompanyService>;

  const mockCompany: CompanyData = {
    id: '1',
    name: 'Awesome Corp',
    website: 'https://awesome.example.com',
    logoPath: '/logos/awesome.png',
    description: 'We build awesome things.',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
  };

  beforeEach(() => {
    service = {
      getStaticCompany: jest.fn(),
      updateStaticCompany: jest.fn(),
      createRecruiter: jest.fn(),
    } as unknown as jest.Mocked<CompanyService>;

    controller = new CompanyController(service);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCompany', () => {
    it('returns public company info', async () => {
      service.getStaticCompany.mockResolvedValue(mockCompany);
      const result = await controller.getCompany();
      expect(service.getStaticCompany).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Company retrieved successfully.', data: mockCompany });
    });
  });

  describe('updateCompany', () => {
    it('returns updated company', async () => {
      const updated = { ...mockCompany, name: 'New Name' };
      service.updateStaticCompany.mockResolvedValue(updated);
      const result = await controller.updateCompany({ name: 'New Name' });
      expect(service.updateStaticCompany).toHaveBeenCalledWith({ name: 'New Name' });
      expect(result).toEqual({ message: 'Company updated successfully.', data: updated });
    });
  });

  describe('createRecruiter', () => {
    it('returns recruiter creation data', async () => {
      const payload: RecruiterCreationData = {
        userId: '10',
        companyRecruiterId: '22',
        email: 'rec@ex.com',
        recuiterLevel: RecuiterLevel.MANAGER,
        companyId: '1',
      };
      service.createRecruiter.mockResolvedValue(payload);
      const result = await controller.createRecruiter({
        firstName: 'Rick',
        lastName: 'Rito',
        email: 'rec@ex.com',
        password: 'Secret123',
        confirmPassword: 'Secret123',
      });
      expect(service.createRecruiter).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Recruiter created successfully.', data: payload });
    });
  });
});

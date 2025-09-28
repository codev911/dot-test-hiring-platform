import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Repository } from 'typeorm';
import { AuthService } from '../../src/auth/auth.service';
import type { RegisterUserDto } from '../../src/auth/dto/register-user.dto';
import type { LoginDto } from '../../src/auth/dto/login.dto';
import { User } from '../../src/entities/user.entity';
import { CompanyRecruiter } from '../../src/entities/company-recruiter.entity';
import { RecuiterLevel } from '../../src/utils/enums/recuiter-level.enum';
import { HashingService } from '../../src/services/hashing.service';

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let recruiterRepository: jest.Mocked<Repository<CompanyRecruiter>>;
  let jwtService: jest.Mocked<JwtService>;

  const password = 'Password123!';
  const email = 'user@example.com';

  const createUser = (overrides: Partial<User> = {}): User => {
    const user = new User();
    (user as Mutable<User>).id = overrides.id ?? '1';
    user.firstName = overrides.firstName ?? 'Test';
    user.lastName = overrides.lastName;
    user.email = overrides.email ?? email;
    (user as Mutable<User>).password =
      overrides.password ?? HashingService.hash(`${user.email}${password}`);
    user.isActive = overrides.isActive;
    return user;
  };

  beforeEach(() => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<User>>;

    recruiterRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<CompanyRecruiter>>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed-token'),
    } as unknown as jest.Mocked<JwtService>;

    service = new AuthService(userRepository, recruiterRepository, jwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerCandidate', () => {
    it('creates and returns token for new candidate', async () => {
      const dto: RegisterUserDto = {
        firstName: 'First',
        lastName: 'Last',
        email,
        password,
        confirmPassword: password,
      };
      userRepository.findOne.mockResolvedValue(null);
      const created = createUser({ lastName: 'Last' });
      userRepository.create.mockReturnValue(created);
      userRepository.save.mockResolvedValue(created);

      const response = await service.registerCandidate(dto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email } });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: 'First',
        lastName: 'Last',
        email,
        password,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.save).toHaveBeenCalledWith(created);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: created.id,
        email: created.email,
        role: 'candidate',
      });
      expect(response).toEqual({
        message: 'Registration successful.',
        data: {
          accessToken: 'signed-token',
          user: {
            id: created.id,
            email: created.email,
            firstName: created.firstName,
            lastName: created.lastName,
          },
          role: 'candidate',
        },
      });
    });

    it('throws when email already registered', async () => {
      userRepository.findOne.mockResolvedValue(createUser());

      await expect(
        service.registerCandidate({
          firstName: 'A',
          email,
          password,
          confirmPassword: password,
        } as RegisterUserDto),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('throws when password confirmation mismatches', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.registerCandidate({
          firstName: 'First',
          email,
          password,
          confirmPassword: 'Different123!',
        } as RegisterUserDto),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('loginCandidate', () => {
    it('issues token for valid credentials', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);

      const response = await service.loginCandidate({ email, password } as LoginDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: 'candidate',
      });
      expect(response.data.role).toBe('candidate');
      expect(response.data.user.email).toBe(email);
    });

    it('throws unauthorized when user missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.loginCandidate({ email, password } as LoginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws unauthorized when password mismatch', async () => {
      const user = createUser({ password: HashingService.hash(`${email}OtherPass123!`) });
      userRepository.findOne.mockResolvedValue(user);

      await expect(service.loginCandidate({ email, password } as LoginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('loginRecruiter', () => {
    const recruiterRecord = (overrides: Partial<CompanyRecruiter> = {}): CompanyRecruiter => {
      const record = new CompanyRecruiter();
      (record as Mutable<CompanyRecruiter>).companyId = overrides.companyId ?? '10';
      (record as Mutable<CompanyRecruiter>).recruiterId = overrides.recruiterId ?? '1';
      (record as Mutable<CompanyRecruiter>).recuiterLevel =
        overrides.recuiterLevel ?? RecuiterLevel.OWNER;
      (record as Mutable<CompanyRecruiter>).is_active = overrides.is_active ?? true;
      return record;
    };

    it('issues recruiter token when membership exists', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);
      recruiterRepository.findOne.mockResolvedValue(recruiterRecord());

      const response = await service.loginRecruiter({ email, password } as LoginDto);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(recruiterRepository.findOne).toHaveBeenCalledWith({
        where: { recruiterId: user.id, is_active: true },
        relations: ['companyIdRel'],
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: 'recruiter',
        recruiter: { companyId: '10', recuiterLevel: RecuiterLevel.OWNER },
      });
      expect(response).toEqual({
        message: 'Login successful.',
        data: {
          accessToken: 'signed-token',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          role: 'recruiter',
          recruiter: { companyId: '10', recuiterLevel: RecuiterLevel.OWNER },
        },
      });
    });

    it('throws unauthorized when user missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.loginRecruiter({ email, password } as LoginDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws forbidden when recruiter record missing', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);
      recruiterRepository.findOne.mockResolvedValue(null);

      await expect(service.loginRecruiter({ email, password } as LoginDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('throws forbidden when recruiter inactive', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);
      recruiterRepository.findOne.mockResolvedValue(recruiterRecord({ is_active: false }));

      await expect(service.loginRecruiter({ email, password } as LoginDto)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('getProfile', () => {
    it('returns profile when payload valid', async () => {
      const user = createUser();
      userRepository.findOne.mockResolvedValue(user);

      const payload = {
        sub: user.id,
        email: user.email,
        role: 'candidate' as const,
      };

      const response = await service.getProfile(payload);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: user.id } });
      expect(response).toEqual({
        message: 'Profile retrieved.',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          },
          role: 'candidate',
        },
      });
    });

    it('throws unauthorized when payload missing', async () => {
      await expect(service.getProfile(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws unauthorized when user missing', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getProfile({ sub: '99', email: 'ghost@example.com', role: 'candidate' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});

import type { INestApplication } from '@nestjs/common';
import { UnauthorizedException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { Request } from 'express';
import { AuthModule } from '../src/auth/auth.module';
import { AuthController } from '../src/auth/auth.controller';
import { RegisterUserDto } from '../src/auth/dto/register-user.dto';
import type { LoginDto } from '../src/auth/dto/login.dto';
import { User } from '../src/entities/user.entity';
import { CompanyRecruiter } from '../src/entities/company-recruiter.entity';
import { RecuiterLevel } from '../src/utils/enums/recuiter-level.enum';
import { HashingService } from '../src/services/hashing.service';

const createUser = (overrides: Partial<User> = {}, plainPassword = 'Password123!'): User => {
  const user = new User();
  user.id = overrides.id ?? '1';
  user.firstName = overrides.firstName ?? 'First';
  user.lastName = overrides.lastName;
  user.email = overrides.email ?? 'user@example.com';
  user.password = overrides.password ?? HashingService.hash(`${user.email}${plainPassword}`);
  return user;
};

const createRecruiterRecord = (overrides: Partial<CompanyRecruiter> = {}): CompanyRecruiter => {
  const record = new CompanyRecruiter();
  record.companyId = overrides.companyId ?? '10';
  record.recruiterId = overrides.recruiterId ?? '1';
  record.recuiterLevel = overrides.recuiterLevel ?? RecuiterLevel.OWNER;
  record.is_active = overrides.is_active ?? true;
  return record;
};

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let controller: AuthController;
  let userRepository: jest.Mocked<Repository<User>>;
  let recruiterRepository: jest.Mocked<Repository<CompanyRecruiter>>;
  let validationPipe: ValidationPipe;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    validationPipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
    await app.init();

    controller = app.get<AuthController>(AuthController);
    userRepository = app.get(getRepositoryToken(User));
    recruiterRepository = app.get(getRepositoryToken(CompanyRecruiter));
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('registers a new candidate', async () => {
    const dto: RegisterUserDto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'candidate@example.com',
      password: 'Password123!',
    };

    userRepository.findOne.mockResolvedValue(null);
    userRepository.create.mockImplementation((payload) => {
      const entity = createUser({ id: '2', email: dto.email });
      Object.assign(entity, payload);
      return entity;
    });
    userRepository.save.mockImplementation((entity: User) => {
      const saved = createUser(
        {
          ...entity,
          id: '2',
          password: HashingService.hash(`${entity.email}${dto.password}`),
        },
        dto.password,
      );
      return Promise.resolve(saved);
    });

    const validated = (await validationPipe.transform(dto, {
      type: 'body',
      metatype: RegisterUserDto,
    })) as RegisterUserDto;

    const response = await controller.registerCandidate(validated);

    expect(response.message).toBe('Registration successful.');
    expect(response.data.accessToken).toEqual(expect.any(String));
    expect(response.data).toMatchObject({
      user: {
        id: '2',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
      role: 'candidate',
    });
  });

  it('rejects login when credentials invalid', async () => {
    const dto: LoginDto = { email: 'invalid@example.com', password: 'Password123!' };
    userRepository.findOne.mockResolvedValue(null);

    await expect(controller.loginCandidate(dto)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logs in recruiter with active membership', async () => {
    const dto: LoginDto = { email: 'recruiter@example.com', password: 'Password123!' };
    const user = createUser({ id: '5', email: dto.email }, dto.password);
    userRepository.findOne.mockResolvedValue(user);
    recruiterRepository.findOne.mockResolvedValue(
      createRecruiterRecord({
        companyId: '77',
        recruiterId: '5',
        recuiterLevel: RecuiterLevel.MANAGER,
      }),
    );

    const response = await controller.loginRecruiter(dto);

    expect(response.message).toBe('Login successful.');
    expect(response.data.accessToken).toEqual(expect.any(String));
    expect(response.data).toMatchObject({
      user: {
        id: '5',
        email: dto.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      role: 'recruiter',
      recruiter: { companyId: '77', recuiterLevel: RecuiterLevel.MANAGER },
    });
  });

  it('prevents recruiter login when membership missing', async () => {
    const dto: LoginDto = { email: 'recruiter@example.com', password: 'Password123!' };
    const user = createUser({ email: dto.email }, dto.password);
    userRepository.findOne.mockResolvedValue(user);
    recruiterRepository.findOne.mockResolvedValue(null);

    await expect(controller.loginRecruiter(dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns profile for authenticated request', async () => {
    const user = createUser({ id: '42', email: 'candidate@example.com' });
    userRepository.findOne.mockResolvedValue(user);

    const payload = { sub: user.id, email: user.email, role: 'candidate' as const };
    const request = { user: payload } as Request & { user: typeof payload };
    const response = await controller.getProfile(request);

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
});

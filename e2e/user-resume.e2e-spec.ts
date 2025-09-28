jest.unmock('@nestjs/jwt');

import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { UserResumeController } from '../src/user-resume/user-resume.controller';
import { UserResumeModule } from '../src/user-resume/user-resume.module';
import { User } from '../src/entities/user.entity';
import { UserResume } from '../src/entities/user-resume.entity';
import { BucketService } from '../src/services/bucket.service';
import { HashingService } from '../src/services/hashing.service';
import { CandidateAuthGuard } from '../src/common/guards/candidate-auth.guard';
import type { JwtPayload } from '../src/utils/types/auth.type';

const userId = 'user-1';
const email = 'user@example.com';
const currentPassword = 'Password123!';

const makeRequest = (): { user: JwtPayload } => ({
  user: {
    sub: userId,
    email,
    role: 'candidate',
  } as JwtPayload,
});

const mockFile = (
  filename = 'resume.pdf',
  mimetype = 'application/pdf',
  content = '%PDF-1.4',
): { originalname: string; mimetype: string; buffer: Buffer } => ({
  originalname: filename,
  mimetype,
  buffer: Buffer.from(content),
});

const makeUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  Object.assign(user, {
    id: userId,
    firstName: 'Jane',
    lastName: 'Doe',
    email,
    password: HashingService.hash(`${email}${currentPassword}`),
    avatarPath: undefined,
    ...overrides,
  });
  return user;
};

describe('UserResumeController (e2e)', () => {
  let app: INestApplication;
  let controller: UserResumeController;
  let userRepository: jest.Mocked<Repository<User>>;
  let userResumeRepository: jest.Mocked<Repository<UserResume>>;
  let bucketService: jest.Mocked<BucketService>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        UserResumeModule,
        JwtModule.register({
          global: true,
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
    })
      .overrideGuard(CandidateAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideProvider(BucketService)
      .useValue({
        uploadObject: jest.fn(
          // eslint-disable-next-line @typescript-eslint/require-await
          async (_key: string, _body: PutObjectCommandInput['Body'], _contentType?: string) => {
            return;
          },
        ),
        // eslint-disable-next-line @typescript-eslint/require-await
        deleteObject: jest.fn(async (_key: string): Promise<void> => {
          return;
        }),
        getPublicUrl: jest.fn((key: string) => `http://localhost:9000/bucket/${key}`),
      } satisfies Partial<jest.Mocked<BucketService>>);

    const moduleFixture = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    controller = app.get<UserResumeController>(UserResumeController);
    const userResumeModuleRef = moduleFixture.select(UserResumeModule);
    userRepository = userResumeModuleRef.get(getRepositoryToken(User));
    userResumeRepository = userResumeModuleRef.get(getRepositoryToken(UserResume));
    bucketService = app.get(BucketService);
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('uploads resume and returns public url (candidate only)', async () => {
    const user = makeUser({});
    userRepository.findOne.mockResolvedValue(user);
    userResumeRepository.findOne.mockResolvedValue(null);
    userResumeRepository.create.mockReturnValue({
      userId,
      resumePath: 'resume/user-1.pdf',
    } as UserResume);
    const pdf = mockFile('resume.pdf', 'application/pdf', '%PDF-1.4');

    const response = await controller.uploadResume(makeRequest() as never, pdf as never);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(bucketService.uploadObject).toHaveBeenCalledWith(
      'resume/user-1.pdf',
      pdf.buffer,
      'application/pdf',
    );
    expect(response).toEqual({
      message: 'Resume uploaded successfully.',
      data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
    });
  });

  it('replaces existing resume and deletes old one', async () => {
    const user = makeUser({});
    userRepository.findOne.mockResolvedValue(user);
    userResumeRepository.findOne.mockResolvedValue({
      userId,
      resumePath: 'resume/old.pdf',
    } as UserResume);
    const pdf = mockFile('resume.pdf', 'application/pdf', '%PDF-1.4');

    const response = await controller.uploadResume(makeRequest() as never, pdf as never);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(bucketService.deleteObject).toHaveBeenCalledWith('resume/old.pdf');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(bucketService.uploadObject).toHaveBeenCalledWith(
      'resume/user-1.pdf',
      pdf.buffer,
      'application/pdf',
    );
    expect(response).toEqual({
      message: 'Resume uploaded successfully.',
      data: { resumeUrl: 'http://localhost:9000/bucket/resume/user-1.pdf' },
    });
  });
});

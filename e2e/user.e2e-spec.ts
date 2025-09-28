jest.unmock('@nestjs/jwt');

import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import type { Request } from 'express';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from '../src/user/user.module';
import { UserController } from '../src/user/user.controller';
import type { ChangePasswordDto } from '../src/user/dto/change-password.dto';
import { User } from '../src/entities/user.entity';
import { BucketService } from '../src/services/bucket.service';
import { HashingService } from '../src/services/hashing.service';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';

const userId = 'user-1';
const email = 'user@example.com';
const currentPassword = 'Password123!';

const makeRequest = (): Request & { user: { sub: string; email: string; role: 'candidate' } } =>
  ({ user: { sub: userId, email, role: 'candidate' } }) as unknown as Request & {
    user: { sub: string; email: string; role: 'candidate' };
  };

const mockFile = (name = 'avatar.png', type = 'image/png', data = 'avatar'): Express.Multer.File =>
  ({
    originalname: name,
    mimetype: type,
    buffer: Buffer.from(data),
  }) as unknown as Express.Multer.File;

// Mutable helper for entity construction
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const makeUser = (overrides: Partial<User> = {}): User => {
  const user = new User();
  (user as Mutable<User>).id = overrides.id ?? userId;
  user.firstName = overrides.firstName ?? 'Jane';
  user.lastName = overrides.lastName;
  user.email = overrides.email ?? email;
  (user as Mutable<User>).password =
    overrides.password ?? HashingService.hash(`${user.email}${currentPassword}`);
  user.avatarPath = overrides.avatarPath;
  return user;
};

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let controller: UserController;
  let userRepository: jest.Mocked<Repository<User>>;
  let bucketService: jest.Mocked<BucketService>;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      imports: [
        UserModule,
        JwtModule.register({
          global: true,
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
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
        getPublicUrl: jest.fn((_key: string) => 'http://localhost:9000/bucket/profile/user-1.png'),
      } satisfies Partial<jest.Mocked<BucketService>>);

    const moduleFixture = await moduleBuilder.compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    controller = app.get<UserController>(UserController);
    const userModuleRef = moduleFixture.select(UserModule);
    userRepository = userModuleRef.get(getRepositoryToken(User));
    bucketService = app.get(BucketService);
  });

  afterEach(async () => {
    await app.close();
    jest.resetAllMocks();
  });

  it('updates password successfully', async () => {
    const user = makeUser();
    userRepository.findOne.mockResolvedValue(user);

    const dto: ChangePasswordDto = {
      currentPassword,
      newPassword: 'NewPassword123!',
      confirmPassword: 'NewPassword123!',
    };

    const response = await controller.changePassword(makeRequest(), dto);

    expect(response).toEqual({ message: 'Password updated successfully.', data: { userId } });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: userId }));
  });

  it('uploads avatar and returns public url', async () => {
    const user = makeUser({ avatarPath: undefined });
    userRepository.findOne.mockResolvedValue(user);
    const file = mockFile();

    const response = await controller.updateAvatar(makeRequest(), file);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(bucketService.uploadObject).toHaveBeenCalledWith(
      'profile/user-1.png',
      file.buffer,
      file.mimetype,
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(userRepository.save).toHaveBeenCalledWith(user);
    expect(response).toEqual({
      message: 'Avatar updated successfully.',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });
  });

  it('returns avatar url when present', async () => {
    const user = makeUser({ avatarPath: 'profile/user-1.png' });
    userRepository.findOne.mockResolvedValue(user);

    const response = await controller.getAvatar(makeRequest());

    expect(response).toEqual({
      message: 'Avatar retrieved successfully.',
      data: { avatarUrl: 'http://localhost:9000/bucket/profile/user-1.png' },
    });
  });

  it('returns null avatar when none exists', async () => {
    const user = makeUser({ avatarPath: undefined });
    userRepository.findOne.mockResolvedValue(user);

    const response = await controller.getAvatar(makeRequest());

    expect(response).toEqual({
      message: 'Avatar retrieved successfully.',
      data: { avatarUrl: null },
    });
  });
});

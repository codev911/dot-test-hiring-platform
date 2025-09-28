import 'reflect-metadata';
import { Logger } from '@nestjs/common';

// Silence NestJS Logger output in tests to keep output clean
jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined as unknown as void);
// Some versions of Nest Logger include fatal; guard in case it exists
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (
  typeof (Logger.prototype as unknown as { fatal?: (msg: unknown, ctx?: string) => void }).fatal ===
  'function'
) {
  jest
    .spyOn(Logger.prototype as unknown as { fatal: (msg: unknown, ctx?: string) => void }, 'fatal')
    .mockImplementation(() => undefined);
}

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.SECRET ??= 'test-secret';
process.env.MYSQL_HOST ??= 'localhost';
process.env.MYSQL_PORT ??= '3306';
process.env.MYSQL_USER ??= 'root';
process.env.MYSQL_PASSWORD ??= 'password';
process.env.MYSQL_DATABASE ??= 'test_db';
process.env.MYSQL_LOGGING ??= 'false';
process.env.JWT_SECRET ??= 'jwt-test-secret';
process.env.JWT_EXPIRES_IN ??= '1h';

class MockJwtService {
  signAsync = jest.fn((payload?: Record<string, unknown>) =>
    Promise.resolve(JSON.stringify(payload ?? {})),
  );

  verifyAsync = jest.fn(<T extends Record<string, unknown>>(token: string) =>
    Promise.resolve(JSON.parse(token) as T),
  );
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
class MockJwtModule {
  static readonly name = 'MockJwtModule';
  private constructor() {}
}

jest.mock('@nestjs/typeorm', () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const actual = jest.requireActual('@nestjs/typeorm');

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  const createRepositoryMock = () => ({
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  });

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class MockTypeOrmRootModule {
    static readonly name = 'MockTypeOrmRootModule';
    private constructor() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class MockTypeOrmRootAsyncModule {
    static readonly name = 'MockTypeOrmRootAsyncModule';
    private constructor() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  class MockTypeOrmFeatureModule {
    static readonly name = 'MockTypeOrmFeatureModule';
    private constructor() {}
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mockedModule = {
    ...actual,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    TypeOrmModule: {
      ...actual.TypeOrmModule,
      forRoot: jest.fn(() => ({
        module: MockTypeOrmRootModule,
        providers: [],
        exports: [],
      })),
      forRootAsync: jest.fn(() => ({
        module: MockTypeOrmRootAsyncModule,
        providers: [],
        exports: [],
      })),
      forFeature: jest.fn((entities: unknown[] = []) => {
        const providers = entities.map((entity) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const token = actual.getRepositoryToken(entity);
          const mock = createRepositoryMock();
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          return { provide: token, useValue: mock };
        });

        return {
          module: MockTypeOrmFeatureModule,
          providers,
          exports: providers,
        };
      }),
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return mockedModule;
});

jest.mock(
  '@nestjs/jwt',
  () => {
    const registerAsync = jest.fn((options?: { global?: boolean }) => ({
      module: MockJwtModule,
      global: options?.global ?? false,
      providers: [{ provide: MockJwtService, useClass: MockJwtService }],
      exports: [MockJwtService],
    }));

    const JwtModule = Object.assign(class JwtModule {}, { registerAsync });

    return {
      JwtModule,
      JwtService: MockJwtService,
    };
  },
  { virtual: true },
);

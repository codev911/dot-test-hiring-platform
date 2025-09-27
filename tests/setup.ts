import 'reflect-metadata';

process.env.NODE_ENV ??= 'test';
process.env.PORT ??= '3000';
process.env.SECRET ??= 'test-secret';
process.env.MYSQL_HOST ??= 'localhost';
process.env.MYSQL_PORT ??= '3306';
process.env.MYSQL_USER ??= 'root';
process.env.MYSQL_PASSWORD ??= 'password';
process.env.MYSQL_DATABASE ??= 'test_db';
process.env.MYSQL_LOGGING ??= 'false';

jest.mock('@nestjs/typeorm', () => {
  const actual = jest.requireActual('@nestjs/typeorm');

  const mockedModule = {
    ...actual,
    TypeOrmModule: {
      ...actual.TypeOrmModule,
      forRoot: jest.fn(() => ({
        module: class MockTypeOrmRootModule {},
        providers: [],
        exports: [],
      })),
      forRootAsync: jest.fn(() => ({
        module: class MockTypeOrmRootAsyncModule {},
        providers: [],
        exports: [],
      })),
      forFeature: jest.fn(() => ({
        module: class MockTypeOrmFeatureModule {},
        providers: [],
        exports: [],
      })),
    },
  };

  return mockedModule;
});

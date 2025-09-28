import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.spec.ts'],
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFiles: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/database/**/*.(t|j)s',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.interfaces.ts',
    '!src/**/*.enum.ts',
    '!src/**/*.enums.ts',
    '!src/**/*.constant.ts',
    '!src/**/*.constants.ts',
    '!src/**/*.type.ts',
    '!src/**/*.types.ts',
    '!src/**/*.module.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.entities.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.dtos.ts',
    '!src/main.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  testEnvironment: 'node',
};

export default config;

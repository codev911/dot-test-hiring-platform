import { configModuleOptions, validateEnv } from '../../../src/utils/config/env.schema';
import { NodeEnv } from '../../../src/utils/enums/node-env.enum';

describe('validateEnv', () => {
  it('returns defaults when config is empty', () => {
    const result = validateEnv({});

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Development,
      PORT: 3000,
    });
  });

  it('parses provided values and coerces types', () => {
    const result = validateEnv({ NODE_ENV: NodeEnv.Test, PORT: '5001' });

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Test,
      PORT: 5001,
    });
  });

  it('throws when validation fails', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'invalid',
        PORT: -1,
      }),
    ).toThrow(/Invalid environment variables/);
  });

  it('exposes configModuleOptions with wired validation', () => {
    const { validate } = configModuleOptions;
    if (!validate) {
      throw new Error('Expected configModuleOptions.validate to be defined');
    }

    const result = validate({
      NODE_ENV: NodeEnv.Production,
      PORT: '4500',
    });

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Production,
      PORT: 4500,
    });
  });
});

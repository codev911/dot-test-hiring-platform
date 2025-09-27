import type { ConfigService } from '@nestjs/config';
import { collectEnv } from '../../../src/utils/config/env.util';
import { NodeEnv } from '../../../src/utils/enums/node-env.enum';
import type { Env } from '../../../src/utils/types/env.type';

describe('collectEnv', () => {
  it('retrieves typed environment values from ConfigService', () => {
    const getOrThrow = jest.fn((key: string) => {
      if (key === 'NODE_ENV') {
        return NodeEnv.Production;
      }

      if (key === 'PORT') {
        return 8080;
      }

      throw new Error(`Unexpected key ${key}`);
    });

    const configService = {
      getOrThrow,
    } as unknown as ConfigService<Env>;

    const result = collectEnv(configService);

    expect(result).toEqual({
      NODE_ENV: NodeEnv.Production,
      PORT: 8080,
    });
    expect(getOrThrow).toHaveBeenCalledWith('NODE_ENV');
    expect(getOrThrow).toHaveBeenCalledWith('PORT');
  });
});

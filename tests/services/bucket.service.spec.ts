import { BucketService } from '../../src/services/bucket.service';
import type { Env } from '../../src/utils/types/env.type';
import type { ConfigService } from '@nestjs/config';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = sendMock;
  }

  class PutObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  class GetObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  class DeleteObjectCommand {
    constructor(public readonly input: unknown) {}
  }

  class HeadBucketCommand {
    constructor(public readonly input: unknown) {}
  }

  class CreateBucketCommand {
    constructor(public readonly input: unknown) {}
  }

  class GetBucketPolicyCommand {
    constructor(public readonly input: unknown) {}
  }

  class PutBucketPolicyCommand {
    constructor(public readonly input: { Policy: string }) {}
  }

  return {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadBucketCommand,
    CreateBucketCommand,
    GetBucketPolicyCommand,
    PutBucketPolicyCommand,
  };
});

const {
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetBucketPolicyCommand,
  PutBucketPolicyCommand,
} = jest.requireMock('@aws-sdk/client-s3');

describe('BucketService', () => {
  const envMap = {
    MINIO_ENDPOINT: 'http://localhost:9000',
    MINIO_ACCESS_KEY: 'access',
    MINIO_SECRET_KEY: 'secret',
    MINIO_BUCKET: 'bucket',
  } satisfies Partial<Env>;

  const configService = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getOrThrow: jest.fn((key: keyof Env) => envMap[key]),
  } as unknown as ConfigService<Env>;

  let bucketPolicy: string | undefined;

  const createService = (): BucketService => {
    const service = new BucketService(configService);
    (
      service as unknown as {
        logger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock };
      }
    ).logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    return service;
  };

  beforeEach(() => {
    bucketPolicy = undefined;
    sendMock.mockReset().mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        return {};
      }

      if (command instanceof CreateBucketCommand) {
        return {};
      }

      if (command instanceof GetBucketPolicyCommand) {
        if (bucketPolicy) {
          return { Policy: bucketPolicy };
        }

        const missingPolicyError = new Error('No policy') as Error & {
          Code?: string;
          $metadata?: { httpStatusCode?: number };
        };
        missingPolicyError.Code = 'NoSuchBucketPolicy';
        missingPolicyError.$metadata = { httpStatusCode: 404 };
        throw missingPolicyError;
      }

      if (command instanceof PutBucketPolicyCommand) {
        bucketPolicy = (command as { input: { Policy: string } }).input.Policy;
        return {};
      }

      return {};
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    (configService.getOrThrow as jest.Mock).mockImplementation((key: keyof Env) => envMap[key]);
  });

  it('uploads objects to MinIO', async () => {
    const service = createService();

    await service.uploadObject('foo.txt', 'body', 'text/plain');

    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(sendMock.mock.calls.at(0)?.[0].input).toEqual({
      Bucket: 'bucket',
      Key: 'foo.txt',
      Body: 'body',
      ContentType: 'text/plain',
    });
  });

  it('retrieves objects from MinIO', async () => {
    const service = createService();

    await service.getObject('foo.txt');

    expect(sendMock).toHaveBeenCalledWith(expect.any(GetObjectCommand));
  });

  it('deletes objects from MinIO', async () => {
    const service = createService();

    await service.deleteObject('foo.txt');

    expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
  });

  it('skips bucket creation when bucket already exists', async () => {
    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.any(PutBucketPolicyCommand));
    expect(bucketPolicy).toBeDefined();

    const appliedPolicy = JSON.parse(bucketPolicy ?? '{}') as {
      Statement: Array<{
        Sid: string;
        Principal: unknown;
        Effect: string;
        Action: string[];
        Resource: string[];
      }>;
    };

    expect(appliedPolicy.Statement).toEqual([
      {
        Sid: 'AllowPublicListBucket',
        Principal: '*',
        Effect: 'Allow',
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: ['arn:aws:s3:::bucket'],
      },
      {
        Sid: 'AllowPublicReadObject',
        Principal: '*',
        Effect: 'Allow',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource: ['arn:aws:s3:::bucket/*'],
      },
    ]);
  });

  it('creates bucket when not found', async () => {
    sendMock.mockImplementationOnce((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const error = new Error('Not found') as Error & { $metadata?: { httpStatusCode?: number } };
        error.$metadata = { httpStatusCode: 404 };
        throw error;
      }
      return {};
    });

    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(CreateBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenNthCalledWith(4, expect.any(PutBucketPolicyCommand));
  });

  it('attempts bucket creation when verification returns access denied', async () => {
    const error = new Error('Forbidden') as Error & { $metadata?: { httpStatusCode?: number } };
    error.$metadata = { httpStatusCode: 403 };
    sendMock.mockImplementationOnce((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        throw error;
      }
      return {};
    });

    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(CreateBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenNthCalledWith(4, expect.any(PutBucketPolicyCommand));

    const logger = (service as unknown as { logger: { error: jest.Mock } }).logger;
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('throws descriptive error when creation fails with access denied', async () => {
    const accessDenied = new Error('Forbidden') as Error & {
      $metadata?: { httpStatusCode?: number };
    };
    accessDenied.$metadata = { httpStatusCode: 403 };

    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        throw accessDenied;
      }

      if (command instanceof CreateBucketCommand) {
        throw accessDenied;
      }

      if (command instanceof GetBucketPolicyCommand) {
        const err = new Error('Missing policy') as Error & {
          Code?: string;
          $metadata?: { httpStatusCode?: number };
        };
        err.Code = 'NoSuchBucketPolicy';
        err.$metadata = { httpStatusCode: 404 };
        throw err;
      }

      if (command instanceof PutBucketPolicyCommand) {
        const err = new Error('Forbidden') as Error & { $metadata?: { httpStatusCode?: number } };
        err.$metadata = { httpStatusCode: 403 };
        throw err;
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /MinIO access denied while creating bucket bucket/,
    );

    const logger = (service as unknown as { logger: { error: jest.Mock } }).logger;
    expect(logger.error).toHaveBeenCalledWith(
      'MinIO access denied while creating bucket bucket. Check credentials and bucket policies.',
      expect.any(String),
    );
  });

  it('rethrows unexpected errors while checking bucket', async () => {
    const error = new Error('Boom');
    sendMock.mockRejectedValueOnce(error);

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(/Failed to verify bucket bucket/);
  });

  it('keeps existing policy when already applied', async () => {
    bucketPolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowPublicListBucket',
          Effect: 'Allow',
          Principal: { AWS: '*' },
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Resource: 'arn:aws:s3:::bucket',
        },
        {
          Sid: 'AllowPublicReadObject',
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObjectVersion', 's3:GetObject'],
          Resource: ['arn:aws:s3:::bucket/*'],
        },
      ],
    });

    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('reapplies policy when parse fails', async () => {
    bucketPolicy = 'not-json';

    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.any(PutBucketPolicyCommand));

    const logger = (service as unknown as { logger: { warn: jest.Mock } }).logger;
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        'Unable to parse existing bucket policy for bucket. Reapplying public-read policy.',
      ),
    );
  });

  it('replaces policy when existing differs from expected', async () => {
    // existing policy: missing ListBucket action, causing a diff
    bucketPolicy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowPublicListBucket',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetBucketLocation'],
          Resource: 'arn:aws:s3:::bucket',
        },
      ],
    });

    const service = createService();

    await service.ensureBucket();

    expect(sendMock).toHaveBeenNthCalledWith(1, expect.any(HeadBucketCommand));
    expect(sendMock).toHaveBeenNthCalledWith(2, expect.any(GetBucketPolicyCommand));
    expect(sendMock).toHaveBeenNthCalledWith(3, expect.any(PutBucketPolicyCommand));

    const logger = (service as unknown as { logger: { warn: jest.Mock } }).logger;
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('policy differs from expected'),
    );
  });

  it('throws when fetching policy fails unexpectedly', async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        return {};
      }

      if (command instanceof GetBucketPolicyCommand) {
        const err = new Error('Boom') as Error & { $metadata?: { httpStatusCode?: number } };
        err.$metadata = { httpStatusCode: 500 };
        throw err;
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /Failed to fetch bucket policy for bucket/,
    );

    const logger = (service as unknown as { logger: { error: jest.Mock } }).logger;
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to fetch bucket policy for bucket',
      expect.any(String),
    );
  });

  it('builds public url using bucket endpoint', () => {
    const service = createService();

    const url = service.getPublicUrl('profile/user.png');

    expect(url).toBe('http://localhost:9000/bucket/profile/user.png');
  });

  it('uploads objects without content type', async () => {
    const service = createService();

    await service.uploadObject('foo.txt', 'body');

    expect(sendMock).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(sendMock.mock.calls.at(0)?.[0].input).toEqual({
      Bucket: 'bucket',
      Key: 'foo.txt',
      Body: 'body',
    });
  });

  it('handles bucket creation failure with non-access denied error', async () => {
    const unknownError = new Error('Unknown error') as Error & {
      $metadata?: { httpStatusCode?: number };
    };
    unknownError.$metadata = { httpStatusCode: 500 };

    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const accessDenied = new Error('Forbidden') as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        accessDenied.$metadata = { httpStatusCode: 403 };
        throw accessDenied;
      }

      if (command instanceof CreateBucketCommand) {
        throw unknownError;
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /Failed to create bucket bucket after access-denied verification response/,
    );

    const logger = (service as unknown as { logger: { error: jest.Mock } }).logger;
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to create bucket bucket after access-denied verification response.',
      expect.any(String),
    );
  });

  it('handles bucket creation failure without cause when not access denied', async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const accessDenied = new Error('Forbidden') as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        accessDenied.$metadata = { httpStatusCode: 403 };
        throw accessDenied;
      }

      if (command instanceof CreateBucketCommand) {
        throw new Error('string error');
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /Failed to create bucket bucket after access-denied verification response/,
    );
  });

  it('handles bucket creation failure without cause when access denied by Code', async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const accessDenied = new Error('Forbidden') as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        accessDenied.$metadata = { httpStatusCode: 403 };
        throw accessDenied;
      }

      if (command instanceof CreateBucketCommand) {
        const createError = { Code: 'AccessDenied' } as unknown;
        throw createError;
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /MinIO access denied while creating bucket bucket/,
    );
  });

  it('handles bucket verification failure without cause', async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        throw new Error('string error');
      }
      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(/Failed to verify bucket bucket/);
  });

  it('handles bucket policy fetch failure without cause', async () => {
    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        return {};
      }

      if (command instanceof GetBucketPolicyCommand) {
        throw new Error('string error');
      }

      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(
      /Failed to fetch bucket policy for bucket/,
    );
  });

  it('handles extract aws error with null input', () => {
    const service = createService();
    const result = (service as any).extractAwsError(null);
    expect(result).toBeNull();
  });

  it('handles extract aws error with non-object input', () => {
    const service = createService();
    const result = (service as any).extractAwsError('string error');
    expect(result).toBeNull();
  });

  it('handles normalise principal with AWS array containing wildcard', () => {
    const service = createService();
    const result = (service as any).normalisePrincipal({ AWS: ['*'] });
    expect(result).toBe('*');
  });

  it('handles normalise principal with AWS string', () => {
    const service = createService();
    const result = (service as any).normalisePrincipal({ AWS: 'arn:aws:iam::123456789:user/test' });
    expect(result).toEqual({ AWS: ['arn:aws:iam::123456789:user/test'] });
  });

  it('handles is missing policy with NoSuchBucket code', () => {
    const error = { Code: 'NoSuchBucket' };
    const service = createService();
    const result = (service as any).isMissingPolicy(error);
    expect(result).toBe(true);
  });

  it('handles serialise policy with array resources and actions', () => {
    const service = createService();
    const document = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'Test',
          Effect: 'Allow',
          Principal: { AWS: ['arn:aws:iam::123:user/test', 'arn:aws:iam::456:user/test2'] },
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: ['arn:aws:s3:::bucket/*', 'arn:aws:s3:::bucket2/*'],
        },
      ],
    };
    const result = (service as any).serialisePolicy(document);
    expect(result).toContain('s3:GetObject');
  });

  it('removes leading slashes from public url key', () => {
    const service = createService();

    const url = service.getPublicUrl('///profile/user.png');

    expect(url).toBe('http://localhost:9000/bucket/profile/user.png');
  });

  it('returns early when bucket is not ready after error handling', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const error = new Error('Unknown error') as Error & {
          $metadata?: { httpStatusCode?: number };
          Code?: string;
        };
        error.$metadata = { httpStatusCode: 500 };
        error.Code = 'InternalError';
        throw error;
      }
      return {};
    });

    const service = createService();

    await expect(service.ensureBucket()).rejects.toThrow(/Failed to verify bucket bucket/);

    logSpy.mockRestore();
  });

  it('returns early when bucket creation fails silently', async () => {
    const bucketReady = false;
    const ensurePublicReadAccessSpy = jest.fn();

    sendMock.mockImplementation((command: unknown) => {
      if (command instanceof HeadBucketCommand) {
        const error = new Error('Access denied') as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        error.$metadata = { httpStatusCode: 403 };
        throw error;
      }

      if (command instanceof CreateBucketCommand) {
        // Simulate creation failure that doesn't throw but leaves bucketReady false
        const error = new Error('Creation failed') as Error & {
          $metadata?: { httpStatusCode?: number };
        };
        error.$metadata = { httpStatusCode: 500 };
        throw error;
      }

      return {};
    });

    const service = createService();

    // Spy on the ensurePublicReadAccess to see if it gets called
    jest
      .spyOn(service as any, 'ensurePublicReadAccess')
      .mockImplementation(ensurePublicReadAccessSpy);

    // This should trigger the access denied -> creation failure path and throw
    await expect(service.ensureBucket()).rejects.toThrow();

    // ensurePublicReadAccess should not be called because bucketReady stays false
    expect(ensurePublicReadAccessSpy).not.toHaveBeenCalled();
  });
});

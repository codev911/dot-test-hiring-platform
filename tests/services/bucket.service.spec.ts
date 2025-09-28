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
});

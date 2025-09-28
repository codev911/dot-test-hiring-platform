import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetBucketPolicyCommand,
  GetObjectCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
  type GetObjectCommandOutput,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import type { Env } from '../utils/types/env.type';
import type {
  BucketPolicyDocument,
  BucketPolicyPrincipal,
  BucketPolicyStatement,
} from '../utils/types/aws.type';

/**
 * Service encapsulating bucket interactions against a MinIO/S3 compatible endpoint.
 */
@Injectable()
export class BucketService {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(BucketService.name);

  /**
   * Build a configured S3 client using environment-backed credentials.
   *
   * @param configService Configurations provider for strongly typed environment variables.
   */
  constructor(private readonly configService: ConfigService<Env>) {
    const endpoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const accessKeyId = this.configService.getOrThrow<string>('MINIO_ACCESS_KEY');
    const secretAccessKey = this.configService.getOrThrow<string>('MINIO_SECRET_KEY');
    this.bucketName = this.configService.getOrThrow<string>('MINIO_BUCKET');

    this.client = new S3Client({
      forcePathStyle: true,
      endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Ensure the target bucket exists, creating it when absent.
   */
  async ensureBucket(): Promise<void> {
    this.logger.log(`Checking bucket ${this.bucketName} availability`);
    let bucketReady = false;

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Bucket ${this.bucketName} already exists`);
      bucketReady = true;
    } catch (error: unknown) {
      const metadata =
        (error as { $metadata?: { httpStatusCode?: number }; Code?: string; name?: string }) ?? {};
      const statusCode = metadata.$metadata?.httpStatusCode;
      const code = metadata.Code ?? metadata.name;
      const notFound = statusCode === 404 || code === 'NoSuchBucket' || code === 'NotFound';
      const accessDenied = statusCode === 403 || code === 'AccessDenied' || code === 'Forbidden';

      if (notFound) {
        this.logger.warn(`Bucket ${this.bucketName} missing. Creating...`);
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
        this.logger.log(`Bucket ${this.bucketName} created successfully`);
        bucketReady = true;
      } else if (accessDenied) {
        this.logger.warn(
          `Bucket ${this.bucketName} returned access denied on verification. Attempting to create with configured credentials...`,
        );

        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          this.logger.log(
            `Bucket ${this.bucketName} provisioned after access-denied verification response`,
          );
          bucketReady = true;
        } catch (createError: unknown) {
          const createCause = createError instanceof Error ? createError : undefined;
          const createMetadata = createError as {
            Code?: string;
            name?: string;
            $metadata?: { httpStatusCode?: number };
          };
          const createCode = createMetadata?.Code ?? createMetadata?.name ?? createCause?.name;
          const denied =
            createCode === 'AccessDenied' ||
            createCode === 'Forbidden' ||
            createMetadata?.$metadata?.httpStatusCode === 403;
          const message = denied
            ? `MinIO access denied while creating bucket ${this.bucketName}. Check credentials and bucket policies.`
            : `Failed to create bucket ${this.bucketName} after access-denied verification response.`;

          this.logger.error(message, createCause?.stack);

          if (createCause) {
            throw new Error(message, { cause: createCause });
          }

          throw new Error(message);
        }
      } else {
        const cause = error instanceof Error ? error : undefined;
        const message = `Failed to verify bucket ${this.bucketName}`;

        this.logger.error(message, cause?.stack);

        if (cause) {
          throw new Error(message, { cause });
        }

        throw new Error(message);
      }
    }

    if (!bucketReady) {
      return;
    }

    await this.ensurePublicReadAccess();
  }

  /**
   * Upload an object to the configured bucket.
   *
   * @param key Destination key within the bucket.
   * @param body Object payload.
   * @param contentType Optional MIME type metadata.
   */
  async uploadObject(
    key: string,
    body: PutObjectCommandInput['Body'],
    contentType?: string,
  ): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: body,
      ...(contentType ? { ContentType: contentType } : {}),
    });

    await this.client.send(command);
  }

  /**
   * Retrieve an object from the bucket.
   *
   * @param key Object key to fetch.
   * @returns The raw GetObject command result.
   */
  async getObject(key: string): Promise<GetObjectCommandOutput> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return this.client.send(command);
  }

  /**
   * Remove an object from the bucket.
   *
   * @param key Object key to delete.
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.client.send(command);
  }

  /**
   * Apply a public-read policy to the bucket so objects can be accessed over HTTP.
   */
  private async ensurePublicReadAccess(): Promise<void> {
    const policyDocument = this.createPublicReadPolicy();
    const expectedPolicy = this.serialisePolicy(policyDocument);

    try {
      const response = await this.client.send(
        new GetBucketPolicyCommand({ Bucket: this.bucketName }),
      );

      if (response.Policy) {
        try {
          const existingDocument = JSON.parse(response.Policy) as BucketPolicyDocument;
          const existingPolicy = this.serialisePolicy(existingDocument);

          if (existingPolicy === expectedPolicy) {
            this.logger.log(
              `Bucket ${this.bucketName} already exposes public read access. Skipping policy update.`,
            );
            return;
          }

          this.logger.warn(
            `Bucket ${this.bucketName} policy differs from expected. Replacing with public-read policy.`,
          );
        } catch (error: unknown) {
          const reason = error instanceof Error ? ` Reason: ${error.message}` : '';
          this.logger.warn(
            `Unable to parse existing bucket policy for ${this.bucketName}. Reapplying public-read policy.${reason}`,
          );
        }
      }
    } catch (error: unknown) {
      if (!this.isMissingPolicy(error)) {
        const cause = error instanceof Error ? error : undefined;
        const message = `Failed to fetch bucket policy for ${this.bucketName}`;
        this.logger.error(message, cause?.stack);

        if (cause) {
          throw new Error(message, { cause });
        }

        throw new Error(message);
      }
    }

    await this.client.send(
      new PutBucketPolicyCommand({ Bucket: this.bucketName, Policy: expectedPolicy }),
    );
    this.logger.log(`Applied public-read policy to bucket ${this.bucketName}`);
  }

  /**
   * Determine whether the error indicates that no bucket policy currently exists.
   *
   * @param error Error thrown by the S3 client.
   * @returns True when the bucket policy is missing.
   */
  private isMissingPolicy(error: unknown): boolean {
    const metadata = error as {
      Code?: string;
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    const statusCode = metadata?.$metadata?.httpStatusCode;
    const code = metadata?.Code ?? metadata?.name;

    return statusCode === 404 || code === 'NoSuchBucketPolicy' || code === 'NoSuchBucket';
  }

  /**
   * Create the public-read policy applied to the MinIO bucket.
   *
   * @returns Document describing the policy to enforce.
   */
  private createPublicReadPolicy(): BucketPolicyDocument {
    const bucketArn = `arn:aws:s3:::${this.bucketName}`;

    const statements: BucketPolicyStatement[] = [
      {
        Sid: 'AllowPublicListBucket',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetBucketLocation', 's3:ListBucket'],
        Resource: bucketArn,
      },
      {
        Sid: 'AllowPublicReadObject',
        Effect: 'Allow',
        Principal: '*',
        Action: ['s3:GetObject', 's3:GetObjectVersion'],
        Resource: `${bucketArn}/*`,
      },
    ];

    return {
      Version: '2012-10-17',
      Statement: statements,
    };
  }

  /**
   * Normalise bucket policy structure to ensure consistent comparisons and serialisation.
   *
   * @param document Policy document to normalise.
   * @returns Stable JSON string representation.
   */
  private serialisePolicy(document: BucketPolicyDocument): string {
    const normalisedStatements = document.Statement.map((statement) => {
      const principal = this.normalisePrincipal(statement.Principal);
      const action = Array.isArray(statement.Action)
        ? [...statement.Action].map((value) => value.trim()).sort()
        : [statement.Action.trim()];
      const resource = Array.isArray(statement.Resource)
        ? [...statement.Resource].map((value) => value.trim()).sort()
        : [statement.Resource.trim()];

      return {
        Sid: statement.Sid,
        Effect: statement.Effect,
        Principal: principal,
        Action: action,
        Resource: resource,
      };
    });

    const sortedStatements = [...normalisedStatements].sort((left, right) =>
      left.Sid.localeCompare(right.Sid),
    );

    return JSON.stringify({
      Version: document.Version,
      Statement: sortedStatements,
    });
  }

  /**
   * Normalize principal representation to ensure comparison works across string/object shapes.
   *
   * @param principal Principal definition from S3 policy statement.
   * @returns Canonical principal representation.
   */
  private normalisePrincipal(principal: BucketPolicyPrincipal): BucketPolicyPrincipal {
    if (typeof principal === 'string') {
      const cleaned = principal.trim();
      return cleaned === '*' ? '*' : { AWS: [cleaned] };
    }

    const aws = principal.AWS;
    const list = Array.isArray(aws) ? [...aws] : [aws];
    const cleanedList = list.map((value) => value.trim()).sort();

    if (cleanedList.length === 1 && cleanedList[0] === '*') {
      return '*';
    }

    return { AWS: cleanedList };
  }
}

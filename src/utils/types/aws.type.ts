/**
 * Principal definition for bucket policy statements.
 */
export type BucketPolicyPrincipal = '*' | { AWS: string | string[] };

/**
 * Bucket policy statement entry describing permissions for the MinIO bucket.
 */
export type BucketPolicyStatement = {
  Sid: string;
  Effect: 'Allow' | 'Deny';
  Principal: BucketPolicyPrincipal;
  Action: string | string[];
  Resource: string | string[];
};

/**
 * Document structure for an S3-compatible bucket policy.
 */
export type BucketPolicyDocument = {
  Version: string;
  Statement: BucketPolicyStatement[];
};

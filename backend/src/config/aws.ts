// =============================================================================
// GovBid Pro - AWS Configuration
// =============================================================================
// AWS SDK configuration for S3, SES, and other AWS services
// =============================================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// =============================================================================
// AWS CONFIGURATION INTERFACES
// =============================================================================

export interface AWSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface S3Config {
  bucket: string;
  region: string;
  acl: string;
  signedUrlExpiry: number;
  maxFileSize: number;
  allowedMimeTypes: string[];
}

export interface StorageConfig {
  aws: AWSConfig;
  s3: S3Config;
  uploadDir: string;
  useLocalStorage: boolean;
}

// =============================================================================
// CONFIGURATION VALUES
// =============================================================================

export const awsConfig: AWSConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
};

export const s3Config: S3Config = {
  bucket: process.env.AWS_S3_BUCKET || 'govbid-pro-uploads',
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',
  acl: process.env.AWS_S3_ACL || 'private',
  signedUrlExpiry: parseInt(process.env.AWS_S3_SIGNED_URL_EXPIRY || '3600', 10), // 1 hour
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,image/png,image/jpeg,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
};

export const storageConfig: StorageConfig = {
  aws: awsConfig,
  s3: s3Config,
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  useLocalStorage: process.env.USE_LOCAL_STORAGE === 'true' || process.env.NODE_ENV === 'development',
};

// =============================================================================
// S3 CLIENT
// =============================================================================

let s3Client: S3Client | null = null;

/**
 * Get S3 client instance (lazy initialization)
 */
export function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: awsConfig.accessKeyId,
        secretAccessKey: awsConfig.secretAccessKey,
      },
    });
  }

  return s3Client;
}

// =============================================================================
// S3 HELPER INTERFACES
// =============================================================================

export interface UploadOptions {
  contentType?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  acl?: string;
}

export interface UploadResult {
  key: string;
  bucket: string;
  url: string;
  size: number;
  contentType: string;
}

export interface FileInfo {
  key: string;
  size: number;
  lastModified: Date;
  contentType?: string;
  metadata?: Record<string, string>;
}

// =============================================================================
// S3 OPERATIONS
// =============================================================================

/**
 * Generate a unique S3 key for a file
 */
export function generateS3Key(
  folder: string,
  filename: string,
  organizationId?: string
): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');

  if (organizationId) {
    return `${folder}/${organizationId}/${timestamp}-${randomId}-${sanitizedFilename}`;
  }

  return `${folder}/${timestamp}-${randomId}-${sanitizedFilename}`;
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Readable | string,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    Body: body,
    ContentType: options.contentType,
    ContentDisposition: options.contentDisposition,
    Metadata: options.metadata,
    ACL: (options.acl || s3Config.acl) as 'private' | 'public-read',
  });

  await client.send(command);

  // Get file size
  let size = 0;
  if (Buffer.isBuffer(body)) {
    size = body.length;
  } else if (typeof body === 'string') {
    size = Buffer.byteLength(body);
  }

  return {
    key,
    bucket: s3Config.bucket,
    url: `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`,
    size,
    contentType: options.contentType || 'application/octet-stream',
  };
}

/**
 * Download a file from S3
 */
export async function downloadFromS3(key: string): Promise<{
  body: Readable;
  contentType?: string;
  contentLength?: number;
}> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });

  const response = await client.send(command);

  return {
    body: response.Body as Readable,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
  };
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
  });

  await client.send(command);
}

/**
 * Check if a file exists in S3
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  const client = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    await client.send(command);
    return true;
  } catch (error) {
    if ((error as Error).name === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * Get file info from S3
 */
export async function getFileInfo(key: string): Promise<FileInfo | null> {
  const client = getS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: s3Config.bucket,
      Key: key,
    });

    const response = await client.send(command);

    return {
      key,
      size: response.ContentLength || 0,
      lastModified: response.LastModified || new Date(),
      contentType: response.ContentType,
      metadata: response.Metadata,
    };
  } catch (error) {
    if ((error as Error).name === 'NotFound') {
      return null;
    }
    throw error;
  }
}

/**
 * List files in S3 with a prefix
 */
export async function listFilesInS3(
  prefix: string,
  maxKeys: number = 1000
): Promise<FileInfo[]> {
  const client = getS3Client();

  const command = new ListObjectsV2Command({
    Bucket: s3Config.bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await client.send(command);

  return (response.Contents || []).map((item) => ({
    key: item.Key || '',
    size: item.Size || 0,
    lastModified: item.LastModified || new Date(),
  }));
}

/**
 * Copy a file within S3
 */
export async function copyInS3(sourceKey: string, destinationKey: string): Promise<void> {
  const client = getS3Client();

  const command = new CopyObjectCommand({
    Bucket: s3Config.bucket,
    CopySource: `${s3Config.bucket}/${sourceKey}`,
    Key: destinationKey,
  });

  await client.send(command);
}

/**
 * Generate a pre-signed URL for upload
 */
export async function getUploadSignedUrl(
  key: string,
  contentType: string,
  expiresIn: number = s3Config.signedUrlExpiry
): Promise<string> {
  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(client, command, { expiresIn });
}

/**
 * Generate a pre-signed URL for download
 */
export async function getDownloadSignedUrl(
  key: string,
  expiresIn: number = s3Config.signedUrlExpiry,
  filename?: string
): Promise<string> {
  const client = getS3Client();

  const command = new GetObjectCommand({
    Bucket: s3Config.bucket,
    Key: key,
    ResponseContentDisposition: filename
      ? `attachment; filename="${filename}"`
      : undefined,
  });

  return getSignedUrl(client, command, { expiresIn });
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate file type
 */
export function isAllowedFileType(mimeType: string): boolean {
  return s3Config.allowedMimeTypes.includes(mimeType);
}

/**
 * Validate file size
 */
export function isAllowedFileSize(size: number): boolean {
  return size <= s3Config.maxFileSize;
}

/**
 * Validate AWS configuration
 */
export function validateAWSConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!storageConfig.useLocalStorage) {
    if (!awsConfig.accessKeyId) {
      errors.push('AWS_ACCESS_KEY_ID is required');
    }
    if (!awsConfig.secretAccessKey) {
      errors.push('AWS_SECRET_ACCESS_KEY is required');
    }
    if (!s3Config.bucket) {
      errors.push('AWS_S3_BUCKET is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// FOLDER CONSTANTS
// =============================================================================

export const S3Folders = {
  CONTRACTS: 'contracts',
  PROPOSALS: 'proposals',
  PAST_PERFORMANCE: 'past-performance',
  DOCUMENTS: 'documents',
  AVATARS: 'avatars',
  LOGOS: 'logos',
  TEMP: 'temp',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  config: storageConfig,
  aws: awsConfig,
  s3: s3Config,
  getS3Client,
  generateS3Key,
  upload: uploadToS3,
  download: downloadFromS3,
  delete: deleteFromS3,
  exists: fileExistsInS3,
  getInfo: getFileInfo,
  list: listFilesInS3,
  copy: copyInS3,
  getUploadUrl: getUploadSignedUrl,
  getDownloadUrl: getDownloadSignedUrl,
  isAllowedFileType,
  isAllowedFileSize,
  validateConfig: validateAWSConfig,
  folders: S3Folders,
};

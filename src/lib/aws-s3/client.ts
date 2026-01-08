import {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/config/env";

export class S3IntegrationClient {
  private client: S3Client;
  private region: string;

  constructor() {
    this.region = env.AWS_REGION ?? "us-east-1";

    // Initialize with credentials from env
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: env.AWS_ACCESS_SECRET_KEY ?? "",
      },
    });
  }

  /**
   * Get the underlying S3 Client
   */
  getClient(): S3Client {
    return this.client;
  }

  /**
   * List all buckets
   */
  async listBuckets() {
    const command = new ListBucketsCommand({});
    return this.client.send(command);
  }

  /**
   * List files in a bucket
   */
  async listFiles(bucket: string, prefix?: string) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    return this.client.send(command);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    bucket: string,
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType?: string,
  ) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    return this.client.send(command);
  }

  /**
   * Get a file from S3 (returns the raw output)
   */
  async getFile(bucket: string, key: string) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return this.client.send(command);
  }

  /**
   * Generate a presigned URL for a file
   */
  async getPresignedUrl(bucket: string, key: string, expiresIn = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(bucket: string, key: string) {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    return this.client.send(command);
  }
}

export const s3Client = new S3IntegrationClient();

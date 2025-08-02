import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createS3Tools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const s3Client = new S3Client({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:s3:list-buckets",
      description: "List all S3 buckets in the account",
      async run() {
        try {
          const command = new ListBucketsCommand({});
          const response = await s3Client.send(command);

          const buckets =
            response.Buckets?.map((bucket) => ({
              name: bucket.Name,
              creationDate: bucket.CreationDate?.toISOString(),
            })) || [];

          return {
            buckets,
            count: buckets.length,
            owner: response.Owner
              ? {
                  id: response.Owner.ID,
                  displayName: response.Owner.DisplayName,
                }
              : undefined,
          };
        } catch (error) {
          throw new Error(
            `S3 list buckets failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:s3:list-objects",
      description: "List objects in an S3 bucket",
      args: z.object({
        bucket: z.string().describe("S3 bucket name"),
        prefix: z
          .string()
          .optional()
          .describe("Object key prefix to filter by"),
        maxKeys: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum number of objects to return"),
        continuationToken: z
          .string()
          .optional()
          .describe("Token for pagination"),
      }),
      async run(args = {}) {
        try {
          const command = new ListObjectsV2Command({
            Bucket: args.bucket,
            Prefix: args.prefix,
            MaxKeys: args.maxKeys,
            ContinuationToken: args.continuationToken,
          });

          const response = await s3Client.send(command);

          const objects =
            response.Contents?.map((obj) => ({
              key: obj.Key,
              lastModified: obj.LastModified?.toISOString(),
              size: obj.Size,
              storageClass: obj.StorageClass,
              etag: obj.ETag,
            })) || [];

          return {
            objects,
            count: objects.length,
            isTruncated: response.IsTruncated,
            nextContinuationToken: response.NextContinuationToken,
            commonPrefixes:
              response.CommonPrefixes?.map((prefix) => prefix.Prefix) || [],
          };
        } catch (error) {
          throw new Error(
            `S3 list objects failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:s3:get-object-metadata",
      description: "Get metadata for an S3 object",
      args: z.object({
        bucket: z.string().describe("S3 bucket name"),
        key: z.string().describe("Object key"),
      }),
      async run(args = {}) {
        try {
          const command = new HeadObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          });

          const response = await s3Client.send(command);

          return {
            contentLength: response.ContentLength,
            contentType: response.ContentType,
            lastModified: response.LastModified?.toISOString(),
            etag: response.ETag,
            storageClass: response.StorageClass,
            metadata: response.Metadata,
            cacheControl: response.CacheControl,
            contentDisposition: response.ContentDisposition,
            contentEncoding: response.ContentEncoding,
            contentLanguage: response.ContentLanguage,
            expires: response.Expires?.toISOString(),
            serverSideEncryption: response.ServerSideEncryption,
            versionId: response.VersionId,
          };
        } catch (error) {
          throw new Error(
            `S3 get object metadata failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:s3:get-object-content",
      description:
        "Get content of an S3 object (use with caution for large files)",
      args: z.object({
        bucket: z.string().describe("S3 bucket name"),
        key: z.string().describe("Object key"),
        maxSizeBytes: z
          .number()
          .max(1024 * 1024)
          .optional()
          .default(1024 * 1024)
          .describe("Maximum file size to read in bytes (default: 1MB)"),
      }),
      async run(args = {}) {
        try {
          // First check object size
          const headCommand = new HeadObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          });
          const headResponse = await s3Client.send(headCommand);

          if (
            headResponse.ContentLength &&
            headResponse.ContentLength > args.maxSizeBytes
          ) {
            throw new Error(
              `Object size (${headResponse.ContentLength} bytes) exceeds maximum allowed size (${args.maxSizeBytes} bytes)`
            );
          }

          const getCommand = new GetObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          });

          const response = await s3Client.send(getCommand);

          if (!response.Body) {
            throw new Error("No content received from S3");
          }

          const content = await response.Body.transformToString();

          return {
            content,
            contentType: response.ContentType,
            contentLength: response.ContentLength,
            lastModified: response.LastModified?.toISOString(),
            etag: response.ETag,
          };
        } catch (error) {
          throw new Error(
            `S3 get object content failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}

import {
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createS3Tools(): Tool[] {
  const getS3Client = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new S3Client({ region })
  }

  return [
    tool({
      name: "aws_s3_list_buckets",
      description: "List all S3 buckets in the account",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
      }),
      async run(args) {
        try {
          const command = new ListBucketsCommand()
          const response = await getS3Client(args.region).send(command)

          const buckets =
            response.Buckets?.map((bucket) => ({
              name: bucket.Name,
              creationDate: bucket.CreationDate?.toISOString(),
            })) || []

          return {
            buckets,
            count: buckets.length,
            owner: response.Owner
              ? {
                  id: response.Owner.ID,
                  displayName: response.Owner.DisplayName,
                }
              : undefined,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_s3_list_buckets",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_s3_list_objects",
      description: "List objects in an S3 bucket",
      args: z.object({
        bucket: z.string().describe("S3 bucket name"),
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
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
      async run(args) {
        try {
          const command = new ListObjectsV2Command({
            Bucket: args.bucket,
            Prefix: args.prefix,
            MaxKeys: args.maxKeys,
            ContinuationToken: args.continuationToken,
          })

          const response = await getS3Client(args.region).send(command)

          const objects =
            response.Contents?.map((obj) => ({
              key: obj.Key,
              lastModified: obj.LastModified?.toISOString(),
              size: obj.Size,
              storageClass: obj.StorageClass,
              etag: obj.ETag,
            })) || []

          return {
            objects,
            count: objects.length,
            isTruncated: response.IsTruncated,
            nextContinuationToken: response.NextContinuationToken,
            commonPrefixes:
              response.CommonPrefixes?.map((prefix) => prefix.Prefix) || [],
          }
        } catch (error) {
          console.error(error)
          throw new ToolError({
            error,
            toolName: "aws_s3_list_objects",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_s3_get_object_metadata",
      description: "Get metadata for an S3 object",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        bucket: z.string().describe("S3 bucket name"),
        key: z.string().describe("Object key"),
      }),
      async run(args) {
        try {
          const command = new HeadObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          })

          const response = await getS3Client(args.region).send(command)

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
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_s3_get_object_metadata",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_s3_get_object_content",
      description:
        "Get content of an S3 object (use with caution for large files)",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        bucket: z.string().describe("S3 bucket name"),
        key: z.string().describe("Object key"),
        maxSizeBytes: z
          .number()
          .max(1024 * 1024)
          .optional()
          .default(1024 * 1024)
          .describe("Maximum file size to read in bytes (default: 1MB)"),
      }),
      async run(args) {
        try {
          // First check object size
          const headCommand = new HeadObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          })
          const headResponse = await getS3Client(args.region).send(headCommand)

          if (
            headResponse.ContentLength &&
            headResponse.ContentLength > args.maxSizeBytes
          ) {
            throw new ToolError({
              message: `Object size (${headResponse.ContentLength} bytes) exceeds maximum allowed size (${args.maxSizeBytes} bytes)`,
              toolName: "aws_s3_get_object_content",
              toolArgs: args,
            })
          }

          const getCommand = new GetObjectCommand({
            Bucket: args.bucket,
            Key: args.key,
          })

          const response = await getS3Client(args.region).send(getCommand)

          if (!response.Body) {
            throw new ToolError({
              message: "No content received from S3",
              toolName: "aws_s3_get_object_content",
              toolArgs: args,
            })
          }

          const content = await response.Body.transformToString()

          return {
            content,
            contentType: response.ContentType,
            contentLength: response.ContentLength,
            lastModified: response.LastModified?.toISOString(),
            etag: response.ETag,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_s3_get_object_content",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}

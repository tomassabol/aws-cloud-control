import {
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  ListQueuesCommand,
  SQSClient,
} from "@aws-sdk/client-sqs"
import { logger } from "@tomassabol/aws-common/utils/logger"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createSQSTools(): Tool[] {
  const getSQSClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new SQSClient({ region })
  }

  return [
    tool({
      name: "aws_sqs_list_queues",
      description: "List SQS queues",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        queueNamePrefix: z
          .string()
          .optional()
          .describe("Prefix to filter queue names"),
        nextToken: z.string().optional().describe("Pagination token"),
        maxResults: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum queues to return"),
      }),
      async run(args) {
        try {
          const command = new ListQueuesCommand({
            QueueNamePrefix: args.queueNamePrefix,
            NextToken: args.nextToken,
            MaxResults: args.maxResults,
          })

          const response = await getSQSClient(args.region).send(command)

          const queues =
            response.QueueUrls?.map((url) => {
              const queueName = url.split("/").pop() || ""
              return {
                queueUrl: url,
                queueName,
              }
            }) || []

          return {
            queues,
            count: queues.length,
            nextToken: response.NextToken,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_sqs_list_queues",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_sqs_get_queue_attributes",
      description: "Get attributes for an SQS queue",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        queueUrl: z.string().describe("SQS queue URL"),
        attributeNames: z
          .array(
            z.enum([
              "All",
              "Policy",
              "VisibilityTimeout",
              "MessageRetentionPeriod",
              "ApproximateNumberOfMessages",
              "ApproximateNumberOfMessagesNotVisible",
              "CreatedTimestamp",
              "LastModifiedTimestamp",
              "QueueArn",
              "ApproximateNumberOfMessagesDelayed",
              "DelaySeconds",
              "ReceiveMessageWaitTimeSeconds",
              "RedrivePolicy",
              "FifoQueue",
              "ContentBasedDeduplication",
              "KmsMasterKeyId",
              "KmsDataKeyReusePeriodSeconds",
              "DeduplicationScope",
              "FifoThroughputLimit",
              "RedriveAllowPolicy",
              "SqsManagedSseEnabled",
              "MaximumMessageSize",
            ]),
          )
          .optional()
          .default(["All"])
          .describe("Queue attributes to retrieve"),
      }),
      async run(args) {
        try {
          const command = new GetQueueAttributesCommand({
            QueueUrl: args.queueUrl,
            AttributeNames: args.attributeNames,
          })

          const response = await getSQSClient(args.region).send(command)

          const attributes = response.Attributes || {}

          // Parse specific attributes for better usability
          const parsedAttributes: Record<string, unknown> = { ...attributes }

          if (attributes.CreatedTimestamp) {
            parsedAttributes.CreatedTimestamp = new Date(
              parseInt(attributes.CreatedTimestamp) * 1000,
            ).toISOString()
          }
          if (attributes.LastModifiedTimestamp) {
            parsedAttributes.LastModifiedTimestamp = new Date(
              parseInt(attributes.LastModifiedTimestamp) * 1000,
            ).toISOString()
          }
          if (attributes.RedrivePolicy) {
            try {
              parsedAttributes.RedrivePolicy = JSON.parse(
                attributes.RedrivePolicy,
              )
            } catch {
              logger.warn("Failed to parse RedrivePolicy", {
                redrivePolicy: attributes.RedrivePolicy,
              })
            }
          }
          if (attributes.Policy) {
            try {
              parsedAttributes.Policy = JSON.parse(attributes.Policy)
            } catch {
              logger.warn("Failed to parse Policy", {
                policy: attributes.Policy,
              })
            }
          }

          return {
            queueUrl: args.queueUrl,
            attributes: parsedAttributes,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_sqs_get_queue_attributes",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_sqs_get_queue_url",
      description: "Get the URL of an SQS queue by name",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        queueName: z.string().describe("SQS queue name"),
        queueOwnerAWSAccountId: z
          .string()
          .optional()
          .describe("AWS account ID of queue owner"),
      }),
      async run(args) {
        try {
          const command = new GetQueueUrlCommand({
            QueueName: args.queueName,
            QueueOwnerAWSAccountId: args.queueOwnerAWSAccountId,
          })

          const response = await getSQSClient(args.region).send(command)

          return {
            queueUrl: response.QueueUrl,
            queueName: args.queueName,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_sqs_get_queue_url",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}

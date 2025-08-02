import {
  SQSClient,
  ListQueuesCommand,
  GetQueueAttributesCommand,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  PurgeQueueCommand,
  GetQueueUrlCommand,
  SendMessageBatchCommand,
  DeleteMessageBatchCommand,
} from "@aws-sdk/client-sqs";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createSQSTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const sqsClient = new SQSClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:sqs:list-queues",
      description: "List SQS queues",
      args: z.object({
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
      async run(args = {}) {
        try {
          const command = new ListQueuesCommand({
            QueueNamePrefix: args.queueNamePrefix,
            NextToken: args.nextToken,
            MaxResults: args.maxResults,
          });

          const response = await sqsClient.send(command);

          const queues =
            response.QueueUrls?.map((url) => {
              const queueName = url.split("/").pop() || "";
              return {
                queueUrl: url,
                queueName,
              };
            }) || [];

          return {
            queues,
            count: queues.length,
            nextToken: response.NextToken,
          };
        } catch (error) {
          throw new Error(
            `SQS list queues failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:get-queue-attributes",
      description: "Get attributes for an SQS queue",
      args: z.object({
        queueUrl: z.string().describe("SQS queue URL"),
        attributeNames: z
          .array(
            z.enum([
              "All",
              "Policy",
              "VisibilityTimeout",
              "MaxReceiveCount",
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
            ])
          )
          .optional()
          .default(["All"])
          .describe("Queue attributes to retrieve"),
      }),
      async run(args = {}) {
        try {
          const command = new GetQueueAttributesCommand({
            QueueUrl: args.queueUrl,
            AttributeNames: args.attributeNames,
          });

          const response = await sqsClient.send(command);

          const attributes = response.Attributes || {};

          // Parse specific attributes for better usability
          const parsedAttributes: any = { ...attributes };

          if (attributes.CreatedTimestamp) {
            parsedAttributes.CreatedTimestamp = new Date(
              parseInt(attributes.CreatedTimestamp) * 1000
            ).toISOString();
          }
          if (attributes.LastModifiedTimestamp) {
            parsedAttributes.LastModifiedTimestamp = new Date(
              parseInt(attributes.LastModifiedTimestamp) * 1000
            ).toISOString();
          }
          if (attributes.RedrivePolicy) {
            try {
              parsedAttributes.RedrivePolicy = JSON.parse(
                attributes.RedrivePolicy
              );
            } catch {}
          }
          if (attributes.Policy) {
            try {
              parsedAttributes.Policy = JSON.parse(attributes.Policy);
            } catch {}
          }

          return {
            queueUrl: args.queueUrl,
            attributes: parsedAttributes,
          };
        } catch (error) {
          throw new Error(
            `SQS get queue attributes failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:send-message",
      description: "Send a message to an SQS queue",
      args: z.object({
        queueUrl: z.string().describe("SQS queue URL"),
        messageBody: z.string().describe("Message body (up to 256KB)"),
        delaySeconds: z
          .number()
          .min(0)
          .max(900)
          .optional()
          .describe("Delay before message becomes available"),
        messageAttributes: z
          .record(
            z.string(),
            z.object({
              stringValue: z.string().optional(),
              binaryValue: z.string().optional(),
              dataType: z
                .string()
                .describe("Data type (String, Number, Binary, etc.)"),
            })
          )
          .optional()
          .describe("Message attributes"),
        messageGroupId: z
          .string()
          .optional()
          .describe("Message group ID (required for FIFO queues)"),
        messageDeduplicationId: z
          .string()
          .optional()
          .describe("Message deduplication ID (for FIFO queues)"),
      }),
      async run(args = {}) {
        try {
          const command = new SendMessageCommand({
            QueueUrl: args.queueUrl,
            MessageBody: args.messageBody,
            DelaySeconds: args.delaySeconds,
            MessageAttributes: args.messageAttributes
              ? Object.fromEntries(
                  Object.entries(args.messageAttributes).map(([key, value]) => [
                    key,
                    {
                      StringValue: value.stringValue,
                      BinaryValue: value.binaryValue
                        ? Buffer.from(value.binaryValue, "base64")
                        : undefined,
                      DataType: value.dataType,
                    },
                  ])
                )
              : undefined,
            MessageGroupId: args.messageGroupId,
            MessageDeduplicationId: args.messageDeduplicationId,
          });

          const response = await sqsClient.send(command);

          return {
            messageId: response.MessageId,
            md5OfBody: response.MD5OfBody,
            md5OfMessageAttributes: response.MD5OfMessageAttributes,
            sequenceNumber: response.SequenceNumber,
          };
        } catch (error) {
          throw new Error(
            `SQS send message failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:receive-messages",
      description: "Receive messages from an SQS queue",
      args: z.object({
        queueUrl: z.string().describe("SQS queue URL"),
        maxNumberOfMessages: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(1)
          .describe("Maximum messages to receive"),
        visibilityTimeout: z
          .number()
          .min(0)
          .max(43200)
          .optional()
          .describe("Visibility timeout in seconds"),
        waitTimeSeconds: z
          .number()
          .min(0)
          .max(20)
          .optional()
          .describe("Long polling wait time"),
        attributeNames: z
          .array(
            z.enum([
              "All",
              "Policy",
              "VisibilityTimeout",
              "MaxReceiveCount",
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
              "SentTimestamp",
              "ApproximateReceiveCount",
              "ApproximateFirstReceiveTimestamp",
              "MessageGroupId",
              "MessageDeduplicationId",
              "SequenceNumber",
            ])
          )
          .optional()
          .describe("Message attributes to retrieve"),
        messageAttributeNames: z
          .array(z.string())
          .optional()
          .describe("Message attribute names to retrieve"),
      }),
      async run(args = {}) {
        try {
          const command = new ReceiveMessageCommand({
            QueueUrl: args.queueUrl,
            MaxNumberOfMessages: args.maxNumberOfMessages,
            VisibilityTimeout: args.visibilityTimeout,
            WaitTimeSeconds: args.waitTimeSeconds,
            AttributeNames: args.attributeNames,
            MessageAttributeNames: args.messageAttributeNames,
          });

          const response = await sqsClient.send(command);

          const messages =
            response.Messages?.map((msg) => ({
              messageId: msg.MessageId,
              receiptHandle: msg.ReceiptHandle,
              md5OfBody: msg.MD5OfBody,
              body: msg.Body,
              attributes: msg.Attributes,
              md5OfMessageAttributes: msg.MD5OfMessageAttributes,
              messageAttributes: msg.MessageAttributes
                ? Object.fromEntries(
                    Object.entries(msg.MessageAttributes).map(
                      ([key, value]) => [
                        key,
                        {
                          stringValue: value.StringValue,
                          binaryValue: value.BinaryValue
                            ? Buffer.from(value.BinaryValue).toString("base64")
                            : undefined,
                          dataType: value.DataType,
                        },
                      ]
                    )
                  )
                : undefined,
            })) || [];

          return {
            messages,
            count: messages.length,
          };
        } catch (error) {
          throw new Error(
            `SQS receive messages failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:delete-message",
      description: "Delete a message from an SQS queue",
      args: z.object({
        queueUrl: z.string().describe("SQS queue URL"),
        receiptHandle: z
          .string()
          .describe("Receipt handle of the message to delete"),
      }),
      async run(args = {}) {
        try {
          const command = new DeleteMessageCommand({
            QueueUrl: args.queueUrl,
            ReceiptHandle: args.receiptHandle,
          });

          await sqsClient.send(command);

          return {
            success: true,
            message: "Message deleted successfully",
          };
        } catch (error) {
          throw new Error(
            `SQS delete message failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:purge-queue",
      description: "Delete all messages in an SQS queue",
      args: z.object({
        queueUrl: z.string().describe("SQS queue URL"),
      }),
      async run(args = {}) {
        try {
          const command = new PurgeQueueCommand({
            QueueUrl: args.queueUrl,
          });

          await sqsClient.send(command);

          return {
            success: true,
            message: "Queue purged successfully",
            warning: "All messages in the queue have been deleted",
          };
        } catch (error) {
          throw new Error(
            `SQS purge queue failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:sqs:get-queue-url",
      description: "Get the URL of an SQS queue by name",
      args: z.object({
        queueName: z.string().describe("SQS queue name"),
        queueOwnerAWSAccountId: z
          .string()
          .optional()
          .describe("AWS account ID of queue owner"),
      }),
      async run(args = {}) {
        try {
          const command = new GetQueueUrlCommand({
            QueueName: args.queueName,
            QueueOwnerAWSAccountId: args.queueOwnerAWSAccountId,
          });

          const response = await sqsClient.send(command);

          return {
            queueUrl: response.QueueUrl,
            queueName: args.queueName,
          };
        } catch (error) {
          throw new Error(
            `SQS get queue URL failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}

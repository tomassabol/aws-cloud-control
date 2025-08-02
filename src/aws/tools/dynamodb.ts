import {
  DynamoDBClient,
  ListTablesCommand,
  DescribeTableCommand,
  ScanCommand,
  QueryCommand,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  BatchGetItemCommand,
  DescribeBackupsCommand,
  ListBackupsCommand,
} from "@aws-sdk/client-dynamodb";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createDynamoDBTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const dynamoClient = new DynamoDBClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:dynamodb:list-tables",
      description: "List DynamoDB tables",
      args: z.object({
        exclusiveStartTableName: z
          .string()
          .optional()
          .describe("Table name to start listing from"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of tables to return"),
      }),
      async run(args = {}) {
        try {
          const command = new ListTablesCommand({
            ExclusiveStartTableName: args.exclusiveStartTableName,
            Limit: args.limit,
          });

          const response = await dynamoClient.send(command);

          return {
            tableNames: response.TableNames || [],
            count: response.TableNames?.length || 0,
            lastEvaluatedTableName: response.LastEvaluatedTableName,
          };
        } catch (error) {
          throw new Error(
            `DynamoDB list tables failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:dynamodb:describe-table",
      description: "Get detailed information about a DynamoDB table",
      args: z.object({
        tableName: z.string().describe("DynamoDB table name"),
      }),
      async run(args = {}) {
        try {
          const command = new DescribeTableCommand({
            TableName: args.tableName,
          });

          const response = await dynamoClient.send(command);
          const table = response.Table;

          if (!table) {
            throw new Error("Table not found");
          }

          return {
            tableName: table.TableName,
            tableStatus: table.TableStatus,
            creationDateTime: table.CreationDateTime?.toISOString(),
            provisionedThroughput: table.ProvisionedThroughput
              ? {
                  readCapacityUnits:
                    table.ProvisionedThroughput.ReadCapacityUnits,
                  writeCapacityUnits:
                    table.ProvisionedThroughput.WriteCapacityUnits,
                  lastIncreaseDateTime:
                    table.ProvisionedThroughput.LastIncreaseDateTime?.toISOString(),
                  lastDecreaseDateTime:
                    table.ProvisionedThroughput.LastDecreaseDateTime?.toISOString(),
                  numberOfDecreasesToday:
                    table.ProvisionedThroughput.NumberOfDecreasesToday,
                }
              : undefined,
            billingModeSummary: table.BillingModeSummary
              ? {
                  billingMode: table.BillingModeSummary.BillingMode,
                  lastUpdateToPayPerRequestDateTime:
                    table.BillingModeSummary.LastUpdateToPayPerRequestDateTime?.toISOString(),
                }
              : undefined,
            tableSizeBytes: table.TableSizeBytes,
            itemCount: table.ItemCount,
            tableArn: table.TableArn,
            tableId: table.TableId,
            keySchema: table.KeySchema?.map((key) => ({
              attributeName: key.AttributeName,
              keyType: key.KeyType,
            })),
            attributeDefinitions: table.AttributeDefinitions?.map((attr) => ({
              attributeName: attr.AttributeName,
              attributeType: attr.AttributeType,
            })),
            globalSecondaryIndexes: table.GlobalSecondaryIndexes?.map(
              (gsi) => ({
                indexName: gsi.IndexName,
                keySchema: gsi.KeySchema?.map((key) => ({
                  attributeName: key.AttributeName,
                  keyType: key.KeyType,
                })),
                projection: gsi.Projection
                  ? {
                      projectionType: gsi.Projection.ProjectionType,
                      nonKeyAttributes: gsi.Projection.NonKeyAttributes,
                    }
                  : undefined,
                indexStatus: gsi.IndexStatus,
                indexSizeBytes: gsi.IndexSizeBytes,
                itemCount: gsi.ItemCount,
                indexArn: gsi.IndexArn,
              })
            ),
            localSecondaryIndexes: table.LocalSecondaryIndexes?.map((lsi) => ({
              indexName: lsi.IndexName,
              keySchema: lsi.KeySchema?.map((key) => ({
                attributeName: key.AttributeName,
                keyType: key.KeyType,
              })),
              projection: lsi.Projection
                ? {
                    projectionType: lsi.Projection.ProjectionType,
                    nonKeyAttributes: lsi.Projection.NonKeyAttributes,
                  }
                : undefined,
              indexSizeBytes: lsi.IndexSizeBytes,
              itemCount: lsi.ItemCount,
              indexArn: lsi.IndexArn,
            })),
            streamSpecification: table.StreamSpecification
              ? {
                  streamEnabled: table.StreamSpecification.StreamEnabled,
                  streamViewType: table.StreamSpecification.StreamViewType,
                }
              : undefined,
            latestStreamLabel: table.LatestStreamLabel,
            latestStreamArn: table.LatestStreamArn,
            tags: table.Tags?.map((tag) => ({
              key: tag.Key,
              value: tag.Value,
            })),
          };
        } catch (error) {
          throw new Error(
            `DynamoDB describe table failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:dynamodb:scan-table",
      description: "Scan a DynamoDB table (use carefully with large tables)",
      args: z.object({
        tableName: z.string().describe("DynamoDB table name"),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .default(100)
          .describe("Maximum items to return"),
        exclusiveStartKey: z
          .record(z.string(), z.any())
          .optional()
          .describe("Key to start scanning from"),
        filterExpression: z
          .string()
          .optional()
          .describe("Filter expression to apply"),
        expressionAttributeNames: z
          .record(z.string(), z.string())
          .optional()
          .describe("Attribute name placeholders"),
        expressionAttributeValues: z
          .record(z.string(), z.any())
          .optional()
          .describe("Attribute value placeholders"),
        select: z
          .enum([
            "ALL_ATTRIBUTES",
            "ALL_PROJECTED_ATTRIBUTES",
            "SPECIFIC_ATTRIBUTES",
            "COUNT",
          ])
          .optional()
          .describe("Attributes to return"),
        projectionExpression: z
          .string()
          .optional()
          .describe("Projection expression for specific attributes"),
      }),
      async run(args = {}) {
        try {
          const command = new ScanCommand({
            TableName: args.tableName,
            Limit: args.limit,
            ExclusiveStartKey: args.exclusiveStartKey,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.expressionAttributeNames,
            ExpressionAttributeValues: args.expressionAttributeValues,
            Select: args.select,
            ProjectionExpression: args.projectionExpression,
          });

          const response = await dynamoClient.send(command);

          return {
            items: response.Items || [],
            count: response.Count || 0,
            scannedCount: response.ScannedCount || 0,
            lastEvaluatedKey: response.LastEvaluatedKey,
            consumedCapacity: response.ConsumedCapacity
              ? {
                  tableName: response.ConsumedCapacity.TableName,
                  capacityUnits: response.ConsumedCapacity.CapacityUnits,
                  readCapacityUnits:
                    response.ConsumedCapacity.ReadCapacityUnits,
                  writeCapacityUnits:
                    response.ConsumedCapacity.WriteCapacityUnits,
                }
              : undefined,
          };
        } catch (error) {
          throw new Error(
            `DynamoDB scan table failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:dynamodb:query-table",
      description: "Query a DynamoDB table using partition key",
      args: z.object({
        tableName: z.string().describe("DynamoDB table name"),
        keyConditionExpression: z.string().describe("Key condition expression"),
        limit: z
          .number()
          .min(1)
          .max(1000)
          .optional()
          .describe("Maximum items to return"),
        exclusiveStartKey: z
          .record(z.string(), z.any())
          .optional()
          .describe("Key to start querying from"),
        filterExpression: z
          .string()
          .optional()
          .describe("Filter expression to apply"),
        expressionAttributeNames: z
          .record(z.string(), z.string())
          .optional()
          .describe("Attribute name placeholders"),
        expressionAttributeValues: z
          .record(z.string(), z.any())
          .optional()
          .describe("Attribute value placeholders"),
        scanIndexForward: z
          .boolean()
          .optional()
          .describe("Query order (true for ascending, false for descending)"),
        indexName: z
          .string()
          .optional()
          .describe("Global secondary index name"),
        select: z
          .enum([
            "ALL_ATTRIBUTES",
            "ALL_PROJECTED_ATTRIBUTES",
            "SPECIFIC_ATTRIBUTES",
            "COUNT",
          ])
          .optional()
          .describe("Attributes to return"),
        projectionExpression: z
          .string()
          .optional()
          .describe("Projection expression for specific attributes"),
      }),
      async run(args = {}) {
        try {
          const command = new QueryCommand({
            TableName: args.tableName,
            KeyConditionExpression: args.keyConditionExpression,
            Limit: args.limit,
            ExclusiveStartKey: args.exclusiveStartKey,
            FilterExpression: args.filterExpression,
            ExpressionAttributeNames: args.expressionAttributeNames,
            ExpressionAttributeValues: args.expressionAttributeValues,
            ScanIndexForward: args.scanIndexForward,
            IndexName: args.indexName,
            Select: args.select,
            ProjectionExpression: args.projectionExpression,
          });

          const response = await dynamoClient.send(command);

          return {
            items: response.Items || [],
            count: response.Count || 0,
            scannedCount: response.ScannedCount || 0,
            lastEvaluatedKey: response.LastEvaluatedKey,
            consumedCapacity: response.ConsumedCapacity
              ? {
                  tableName: response.ConsumedCapacity.TableName,
                  capacityUnits: response.ConsumedCapacity.CapacityUnits,
                  readCapacityUnits:
                    response.ConsumedCapacity.ReadCapacityUnits,
                  writeCapacityUnits:
                    response.ConsumedCapacity.WriteCapacityUnits,
                }
              : undefined,
          };
        } catch (error) {
          throw new Error(
            `DynamoDB query table failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:dynamodb:get-item",
      description: "Get a specific item from DynamoDB table",
      args: z.object({
        tableName: z.string().describe("DynamoDB table name"),
        key: z.record(z.string(), z.any()).describe("Primary key of the item"),
        attributesToGet: z
          .array(z.string())
          .optional()
          .describe("Specific attributes to retrieve"),
        consistentRead: z
          .boolean()
          .optional()
          .describe("Use strongly consistent read"),
        projectionExpression: z
          .string()
          .optional()
          .describe("Projection expression for specific attributes"),
        expressionAttributeNames: z
          .record(z.string(), z.string())
          .optional()
          .describe("Attribute name placeholders"),
      }),
      async run(args = {}) {
        try {
          const command = new GetItemCommand({
            TableName: args.tableName,
            Key: args.key,
            AttributesToGet: args.attributesToGet,
            ConsistentRead: args.consistentRead,
            ProjectionExpression: args.projectionExpression,
            ExpressionAttributeNames: args.expressionAttributeNames,
          });

          const response = await dynamoClient.send(command);

          return {
            item: response.Item || null,
            consumedCapacity: response.ConsumedCapacity
              ? {
                  tableName: response.ConsumedCapacity.TableName,
                  capacityUnits: response.ConsumedCapacity.CapacityUnits,
                  readCapacityUnits:
                    response.ConsumedCapacity.ReadCapacityUnits,
                  writeCapacityUnits:
                    response.ConsumedCapacity.WriteCapacityUnits,
                }
              : undefined,
          };
        } catch (error) {
          throw new Error(
            `DynamoDB get item failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:dynamodb:list-backups",
      description: "List DynamoDB table backups",
      args: z.object({
        tableName: z
          .string()
          .optional()
          .describe("Filter backups by table name"),
        limit: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum backups to return"),
        timeRangeLowerBound: z
          .string()
          .optional()
          .describe("Lower bound for backup creation time (ISO string)"),
        timeRangeUpperBound: z
          .string()
          .optional()
          .describe("Upper bound for backup creation time (ISO string)"),
        backupType: z
          .enum(["USER", "SYSTEM", "AWS_BACKUP", "ALL"])
          .optional()
          .default("ALL")
          .describe("Type of backups to list"),
      }),
      async run(args = {}) {
        try {
          const command = new ListBackupsCommand({
            TableName: args.tableName,
            Limit: args.limit,
            TimeRangeLowerBound: args.timeRangeLowerBound
              ? new Date(args.timeRangeLowerBound)
              : undefined,
            TimeRangeUpperBound: args.timeRangeUpperBound
              ? new Date(args.timeRangeUpperBound)
              : undefined,
            BackupType: args.backupType,
          });

          const response = await dynamoClient.send(command);

          const backups =
            response.BackupSummaries?.map((backup) => ({
              tableName: backup.TableName,
              tableId: backup.TableId,
              tableArn: backup.TableArn,
              backupArn: backup.BackupArn,
              backupName: backup.BackupName,
              backupCreationDateTime:
                backup.BackupCreationDateTime?.toISOString(),
              backupExpiryDateTime: backup.BackupExpiryDateTime?.toISOString(),
              backupStatus: backup.BackupStatus,
              backupType: backup.BackupType,
              backupSizeBytes: backup.BackupSizeBytes,
            })) || [];

          return {
            backups,
            count: backups.length,
            lastEvaluatedBackupArn: response.LastEvaluatedBackupArn,
          };
        } catch (error) {
          throw new Error(
            `DynamoDB list backups failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}

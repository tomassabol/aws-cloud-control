import {
  LambdaClient,
  ListFunctionsCommand,
  GetFunctionCommand,
  GetFunctionConfigurationCommand,
  InvokeCommand,
  ListLayersCommand,
  ListAliasesCommand,
  GetAccountSettingsCommand,
} from "@aws-sdk/client-lambda";
import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createLambdaTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  const lambdaClient = new LambdaClient({
    region,
    credentials,
  });

  return [
    tool({
      name: "aws:lambda:list-functions",
      description: "List Lambda functions with optional filtering",
      args: z.object({
        functionVersion: z
          .enum(["ALL"])
          .optional()
          .describe("Function version to list"),
        marker: z.string().optional().describe("Pagination marker"),
        maxItems: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum functions to return"),
        masterRegion: z
          .string()
          .optional()
          .describe("Master region for global functions"),
      }),
      async run(args = {}) {
        try {
          const command = new ListFunctionsCommand({
            FunctionVersion: args.functionVersion,
            Marker: args.marker,
            MaxItems: args.maxItems,
            MasterRegion: args.masterRegion,
          });

          const response = await lambdaClient.send(command);

          const functions =
            response.Functions?.map((func) => ({
              functionName: func.FunctionName,
              functionArn: func.FunctionArn,
              runtime: func.Runtime,
              role: func.Role,
              handler: func.Handler,
              codeSize: func.CodeSize,
              description: func.Description,
              timeout: func.Timeout,
              memorySize: func.MemorySize,
              lastModified: func.LastModified,
              codeSha256: func.CodeSha256,
              version: func.Version,
              environment: func.Environment?.Variables,
              kmsKeyArn: func.KMSKeyArn,
              tracingConfig: func.TracingConfig?.Mode,
              masterArn: func.MasterArn,
              revisionId: func.RevisionId,
              layers: func.Layers?.map((layer) => ({
                arn: layer.Arn,
                codeSize: layer.CodeSize,
                signingProfileVersionArn: layer.SigningProfileVersionArn,
                signingJobArn: layer.SigningJobArn,
              })),
              state: func.State,
              stateReason: func.StateReason,
              lastUpdateStatus: func.LastUpdateStatus,
              packageType: func.PackageType,
              architectures: func.Architectures,
            })) || [];

          return {
            functions,
            count: functions.length,
            nextMarker: response.NextMarker,
          };
        } catch (error) {
          throw new Error(
            `Lambda list functions failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:lambda:get-function",
      description: "Get detailed information about a Lambda function",
      args: z.object({
        functionName: z.string().describe("Function name, ARN, or partial ARN"),
        qualifier: z.string().optional().describe("Function version or alias"),
      }),
      async run(args = {}) {
        try {
          const command = new GetFunctionCommand({
            FunctionName: args.functionName,
            Qualifier: args.qualifier,
          });

          const response = await lambdaClient.send(command);

          const config = response.Configuration;
          const code = response.Code;

          return {
            configuration: config
              ? {
                  functionName: config.FunctionName,
                  functionArn: config.FunctionArn,
                  runtime: config.Runtime,
                  role: config.Role,
                  handler: config.Handler,
                  codeSize: config.CodeSize,
                  description: config.Description,
                  timeout: config.Timeout,
                  memorySize: config.MemorySize,
                  lastModified: config.LastModified,
                  codeSha256: config.CodeSha256,
                  version: config.Version,
                  environment: config.Environment?.Variables,
                  kmsKeyArn: config.KMSKeyArn,
                  tracingConfig: config.TracingConfig?.Mode,
                  masterArn: config.MasterArn,
                  revisionId: config.RevisionId,
                  state: config.State,
                  stateReason: config.StateReason,
                  lastUpdateStatus: config.LastUpdateStatus,
                  packageType: config.PackageType,
                  architectures: config.Architectures,
                  ephemeralStorage: config.EphemeralStorage?.Size,
                  deadLetterConfig: config.DeadLetterConfig?.TargetArn,
                  vpcConfig: config.VpcConfig
                    ? {
                        subnetIds: config.VpcConfig.SubnetIds,
                        securityGroupIds: config.VpcConfig.SecurityGroupIds,
                        vpcId: config.VpcConfig.VpcId,
                      }
                    : undefined,
                }
              : undefined,
            code: code
              ? {
                  repositoryType: code.RepositoryType,
                  location: code.Location,
                  imageUri: code.ImageUri,
                  resolvedImageUri: code.ResolvedImageUri,
                }
              : undefined,
            tags: response.Tags,
          };
        } catch (error) {
          throw new Error(
            `Lambda get function failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:lambda:invoke-function",
      description: "Invoke a Lambda function synchronously",
      args: z.object({
        functionName: z.string().describe("Function name, ARN, or partial ARN"),
        payload: z
          .string()
          .optional()
          .describe("JSON payload to send to function"),
        invocationType: z
          .enum(["RequestResponse", "Event", "DryRun"])
          .optional()
          .default("RequestResponse")
          .describe("Invocation type"),
        logType: z
          .enum(["None", "Tail"])
          .optional()
          .describe("Log type for synchronous invocations"),
        qualifier: z.string().optional().describe("Function version or alias"),
      }),
      async run(args = {}) {
        try {
          const command = new InvokeCommand({
            FunctionName: args.functionName,
            Payload: args.payload
              ? new TextEncoder().encode(args.payload)
              : undefined,
            InvocationType: args.invocationType,
            LogType: args.logType,
            Qualifier: args.qualifier,
          });

          const response = await lambdaClient.send(command);

          let payload: any = undefined;
          if (response.Payload) {
            const payloadString = new TextDecoder().decode(response.Payload);
            try {
              payload = JSON.parse(payloadString);
            } catch {
              payload = payloadString;
            }
          }

          let logResult: string | undefined = undefined;
          if (response.LogResult) {
            logResult = Buffer.from(response.LogResult, "base64").toString(
              "utf-8"
            );
          }

          return {
            statusCode: response.StatusCode,
            functionError: response.FunctionError,
            logResult,
            payload,
            executedVersion: response.ExecutedVersion,
          };
        } catch (error) {
          throw new Error(
            `Lambda invoke function failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:lambda:list-layers",
      description: "List Lambda layers",
      args: z.object({
        compatibleRuntime: z
          .string()
          .optional()
          .describe("Runtime to filter layers by"),
        marker: z.string().optional().describe("Pagination marker"),
        maxItems: z
          .number()
          .min(1)
          .max(10000)
          .optional()
          .describe("Maximum layers to return"),
        compatibleArchitecture: z
          .enum(["x86_64", "arm64"])
          .optional()
          .describe("Architecture compatibility"),
      }),
      async run(args = {}) {
        try {
          const command = new ListLayersCommand({
            CompatibleRuntime: args.compatibleRuntime,
            Marker: args.marker,
            MaxItems: args.maxItems,
            CompatibleArchitecture: args.compatibleArchitecture,
          });

          const response = await lambdaClient.send(command);

          const layers =
            response.Layers?.map((layer) => ({
              layerName: layer.LayerName,
              layerArn: layer.LayerArn,
              latestMatchingVersion: layer.LatestMatchingVersion
                ? {
                    layerVersionArn:
                      layer.LatestMatchingVersion.LayerVersionArn,
                    version: layer.LatestMatchingVersion.Version,
                    description: layer.LatestMatchingVersion.Description,
                    createdDate: layer.LatestMatchingVersion.CreatedDate,
                    compatibleRuntimes:
                      layer.LatestMatchingVersion.CompatibleRuntimes,
                    licenseInfo: layer.LatestMatchingVersion.LicenseInfo,
                    compatibleArchitectures:
                      layer.LatestMatchingVersion.CompatibleArchitectures,
                  }
                : undefined,
            })) || [];

          return {
            layers,
            count: layers.length,
            nextMarker: response.NextMarker,
          };
        } catch (error) {
          throw new Error(
            `Lambda list layers failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:lambda:get-account-settings",
      description: "Get Lambda account-level settings and limits",
      async run() {
        try {
          const command = new GetAccountSettingsCommand({});
          const response = await lambdaClient.send(command);

          return {
            accountLimit: response.AccountLimit
              ? {
                  totalCodeSize: response.AccountLimit.TotalCodeSize,
                  codeSizeUnzipped: response.AccountLimit.CodeSizeUnzipped,
                  codeSizeZipped: response.AccountLimit.CodeSizeZipped,
                  concurrentExecutions:
                    response.AccountLimit.ConcurrentExecutions,
                  unreservedConcurrentExecutions:
                    response.AccountLimit.UnreservedConcurrentExecutions,
                }
              : undefined,
            accountUsage: response.AccountUsage
              ? {
                  totalCodeSize: response.AccountUsage.TotalCodeSize,
                  functionCount: response.AccountUsage.FunctionCount,
                }
              : undefined,
          };
        } catch (error) {
          throw new Error(
            `Lambda get account settings failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}

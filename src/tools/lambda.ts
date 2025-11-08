import {
  GetAccountSettingsCommand,
  GetFunctionCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListLayersCommand,
} from "@aws-sdk/client-lambda"
import { z } from "zod"

import {
  AWS_REGIONS,
  type AwsRegion,
  DEFAULT_AWS_REGION,
} from "~/utils/aws-region"
import { type Tool, tool } from "~/utils/tool"
import { ToolError } from "~/utils/tool-error"

export function createLambdaTools(): Tool[] {
  const getLambdaClient = (region: AwsRegion = DEFAULT_AWS_REGION) => {
    return new LambdaClient({ region })
  }

  return [
    tool({
      name: "aws_lambda_list_functions",
      description: "List Lambda functions with optional filtering",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
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
      async run(args) {
        try {
          const command = new ListFunctionsCommand({
            FunctionVersion: args.functionVersion,
            Marker: args.marker,
            MaxItems: args.maxItems,
            MasterRegion: args.masterRegion,
          })

          const response = await getLambdaClient(args.region).send(command)

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
            })) || []

          return {
            functions,
            count: functions.length,
            nextMarker: response.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_lambda_list_functions",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_lambda_get_function",
      description: "Get detailed information about a Lambda function",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        functionName: z.string().describe("Function name, ARN, or partial ARN"),
        qualifier: z.string().optional().describe("Function version or alias"),
      }),
      async run(args) {
        try {
          const command = new GetFunctionCommand({
            FunctionName: args.functionName,
            Qualifier: args.qualifier,
          })

          const response = await getLambdaClient(args.region).send(command)

          const config = response.Configuration
          const code = response.Code

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
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_lambda_get_function",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_lambda_list_layers",
      description: "List Lambda layers",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
        compatibleRuntime: z
          .enum([
            "python3.9",
            "dotnet8",
            "go1.x",
            "ruby2.5",
            "ruby2.7",
            "provided",
            "provided.al2",
            "nodejs18.x",
            "nodejs20.x",
            "nodejs22.x",
            "nodejs24.x",
          ] as const)
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
      async run(args) {
        try {
          const command = new ListLayersCommand({
            CompatibleRuntime: args.compatibleRuntime,
            Marker: args.marker,
            MaxItems: args.maxItems,
            CompatibleArchitecture: args.compatibleArchitecture,
          })

          const response = await getLambdaClient(args.region).send(command)

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
            })) || []

          return {
            layers,
            count: layers.length,
            nextMarker: response.NextMarker,
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_lambda_list_layers",
            toolArgs: args,
          })
        }
      },
    }),

    tool({
      name: "aws_lambda_get_account_settings",
      description: "Get Lambda account-level settings and limits",
      args: z.object({
        region: z
          .enum(AWS_REGIONS)
          .describe("AWS region")
          .optional()
          .default(DEFAULT_AWS_REGION),
      }),
      async run(args) {
        try {
          const command = new GetAccountSettingsCommand({})
          const response = await getLambdaClient(args.region).send(command)

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
          }
        } catch (error) {
          throw new ToolError({
            error,
            toolName: "aws_lambda_get_account_settings",
            toolArgs: args,
          })
        }
      },
    }),
  ]
}

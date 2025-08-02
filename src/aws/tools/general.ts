import { z } from "zod";
import { tool } from "../../tool";
import type { AWSConfig } from "../auth";
import { createAWSCredentials, getAWSRegion } from "../auth";

export function createGeneralAWSTools(config?: AWSConfig) {
  const credentials = createAWSCredentials(config);
  const region = getAWSRegion(config);

  return [
    tool({
      name: "aws:general:execute-command",
      description:
        "Execute any AWS SDK command with dynamic service and operation",
      args: z.object({
        service: z
          .string()
          .describe(
            "AWS service name (e.g., 'ec2', 'lambda', 's3', 'dynamodb')"
          ),
        operation: z
          .string()
          .describe(
            "Operation name (e.g., 'describeInstances', 'listFunctions')"
          ),
        parameters: z
          .record(z.string(), z.any())
          .optional()
          .describe("Parameters for the operation"),
        region: z
          .string()
          .optional()
          .describe("Override region for this operation"),
      }),
      async run(args = {}) {
        try {
          // Import the AWS SDK client dynamically
          const serviceName = args.service.toLowerCase();

          // Handle special naming cases for AWS SDK clients
          let clientName: string;
          if (serviceName === "ec2") {
            clientName = "EC2Client";
          } else if (serviceName === "s3") {
            clientName = "S3Client";
          } else if (serviceName === "iam") {
            clientName = "IAMClient";
          } else if (serviceName === "sqs") {
            clientName = "SQSClient";
          } else if (serviceName === "sns") {
            clientName = "SNSClient";
          } else if (serviceName === "rds") {
            clientName = "RDSClient";
          } else if (serviceName === "ecs") {
            clientName = "ECSClient";
          } else if (serviceName === "eks") {
            clientName = "EKSClient";
          } else if (serviceName === "acm") {
            clientName = "ACMClient";
          } else if (serviceName === "kms") {
            clientName = "KMSClient";
          } else if (serviceName === "ssm") {
            clientName = "SSMClient";
          } else {
            // Default case: capitalize first letter and add Client
            clientName =
              serviceName.charAt(0).toUpperCase() +
              serviceName.slice(1) +
              "Client";
          }

          const commandName =
            args.operation.charAt(0).toUpperCase() +
            args.operation.slice(1) +
            "Command";

          let clientModule: any;
          let Client: any;
          let Command: any;

          // Map common service names to their SDK package names
          const serviceMap: Record<string, string> = {
            ec2: "@aws-sdk/client-ec2",
            lambda: "@aws-sdk/client-lambda",
            s3: "@aws-sdk/client-s3",
            dynamodb: "@aws-sdk/client-dynamodb",
            iam: "@aws-sdk/client-iam",
            cloudwatch: "@aws-sdk/client-cloudwatch",
            sqs: "@aws-sdk/client-sqs",
            apigateway: "@aws-sdk/client-apigateway",
            apigatewayv2: "@aws-sdk/client-apigatewayv2",
            appconfig: "@aws-sdk/client-appconfig",
            opensearch: "@aws-sdk/client-opensearch",
            greengrassv2: "@aws-sdk/client-greengrassv2",
            costexplorer: "@aws-sdk/client-cost-explorer",
            pricing: "@aws-sdk/client-pricing",
            sns: "@aws-sdk/client-sns",
            stepfunctions: "@aws-sdk/client-sfn",
            rds: "@aws-sdk/client-rds",
            ecs: "@aws-sdk/client-ecs",
            eks: "@aws-sdk/client-eks",
            cloudformation: "@aws-sdk/client-cloudformation",
            route53: "@aws-sdk/client-route-53",
            acm: "@aws-sdk/client-acm",
            secrets: "@aws-sdk/client-secrets-manager",
            ssm: "@aws-sdk/client-ssm",
            kms: "@aws-sdk/client-kms",
            cognito: "@aws-sdk/client-cognito-identity-provider",
          };

          const packageName = serviceMap[serviceName];
          if (!packageName) {
            throw new Error(
              `Unsupported service: ${serviceName}. Supported services: ${Object.keys(
                serviceMap
              ).join(", ")}`
            );
          }

          try {
            clientModule = await import(packageName);
          } catch (importError) {
            throw new Error(
              `Failed to import ${packageName}. Make sure the package is installed: bun add ${packageName}`
            );
          }

          // Get the client and command constructors
          Client = clientModule[clientName];
          Command = clientModule[commandName];

          if (!Client) {
            // Debug: show available exports
            const availableClients = Object.keys(clientModule)
              .filter((k) => k.includes("Client"))
              .sort();
            throw new Error(
              `Client ${clientName} not found in ${packageName}. Available clients: ${availableClients.join(
                ", "
              )}`
            );
          }

          if (!Command) {
            // Debug: show available commands
            const availableCommands = Object.keys(clientModule)
              .filter((k) => k.includes("Command"))
              .slice(0, 10);
            throw new Error(
              `Command ${commandName} not found in ${packageName}. Sample commands: ${availableCommands.join(
                ", "
              )}...`
            );
          }

          // Create client instance
          const client = new Client({
            region: args.region || region,
            credentials,
          });

          // Create and execute command
          const command = new Command(args.parameters || {});
          const response = await client.send(command);

          return {
            service: args.service,
            operation: args.operation,
            region: args.region || region,
            result: response,
          };
        } catch (error) {
          throw new Error(
            `AWS general command failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),

    tool({
      name: "aws:general:list-services",
      description: "List supported AWS services for the general command tool",
      async run() {
        const supportedServices = [
          { service: "ec2", description: "Amazon Elastic Compute Cloud" },
          { service: "lambda", description: "AWS Lambda" },
          { service: "s3", description: "Amazon Simple Storage Service" },
          { service: "dynamodb", description: "Amazon DynamoDB" },
          { service: "iam", description: "AWS Identity and Access Management" },
          { service: "cloudwatch", description: "Amazon CloudWatch" },
          { service: "sqs", description: "Amazon Simple Queue Service" },
          { service: "apigateway", description: "Amazon API Gateway (REST)" },
          {
            service: "apigatewayv2",
            description: "Amazon API Gateway v2 (HTTP/WebSocket)",
          },
          { service: "appconfig", description: "AWS AppConfig" },
          { service: "opensearch", description: "Amazon OpenSearch Service" },
          { service: "greengrassv2", description: "AWS IoT Greengrass v2" },
          { service: "costexplorer", description: "AWS Cost Explorer" },
          { service: "pricing", description: "AWS Pricing" },
          { service: "sns", description: "Amazon Simple Notification Service" },
          { service: "stepfunctions", description: "AWS Step Functions" },
          { service: "rds", description: "Amazon Relational Database Service" },
          { service: "ecs", description: "Amazon Elastic Container Service" },
          { service: "eks", description: "Amazon Elastic Kubernetes Service" },
          { service: "cloudformation", description: "AWS CloudFormation" },
          { service: "route53", description: "Amazon Route 53" },
          { service: "acm", description: "AWS Certificate Manager" },
          { service: "secrets", description: "AWS Secrets Manager" },
          { service: "ssm", description: "AWS Systems Manager" },
          { service: "kms", description: "AWS Key Management Service" },
          { service: "cognito", description: "Amazon Cognito" },
        ];

        return {
          supportedServices,
          count: supportedServices.length,
          note: "To use a service, install its SDK package: bun add @aws-sdk/client-<service-name>",
          examples: [
            {
              service: "ec2",
              operation: "describeInstances",
              parameters: { MaxResults: 10 },
            },
            {
              service: "lambda",
              operation: "listFunctions",
              parameters: { MaxItems: 50 },
            },
            {
              service: "s3",
              operation: "listBuckets",
              parameters: {},
            },
          ],
        };
      },
    }),

    tool({
      name: "aws:general:describe-operation",
      description:
        "Get information about available operations for an AWS service",
      args: z.object({
        service: z
          .string()
          .describe("AWS service name (e.g., 'ec2', 'lambda', 's3')"),
      }),
      async run(args = {}) {
        try {
          const serviceName = args.service.toLowerCase();

          // Map service names to their SDK package names
          const serviceMap: Record<string, string> = {
            ec2: "@aws-sdk/client-ec2",
            lambda: "@aws-sdk/client-lambda",
            s3: "@aws-sdk/client-s3",
            dynamodb: "@aws-sdk/client-dynamodb",
            iam: "@aws-sdk/client-iam",
            cloudwatch: "@aws-sdk/client-cloudwatch",
            sqs: "@aws-sdk/client-sqs",
            apigateway: "@aws-sdk/client-apigateway",
            apigatewayv2: "@aws-sdk/client-apigatewayv2",
            appconfig: "@aws-sdk/client-appconfig",
            opensearch: "@aws-sdk/client-opensearch",
            greengrassv2: "@aws-sdk/client-greengrassv2",
            costexplorer: "@aws-sdk/client-cost-explorer",
            pricing: "@aws-sdk/client-pricing",
          };

          const packageName = serviceMap[serviceName];
          if (!packageName) {
            throw new Error(`Unsupported service: ${serviceName}`);
          }

          let clientModule: any;
          try {
            clientModule = await import(packageName);
          } catch (importError) {
            throw new Error(
              `Failed to import ${packageName}. Make sure the package is installed.`
            );
          }

          // Extract command names from the module
          const commands = Object.keys(clientModule)
            .filter((key) => key.endsWith("Command"))
            .map((commandName) => {
              const operationName = commandName.replace("Command", "");
              return {
                command: commandName,
                operation:
                  operationName.charAt(0).toLowerCase() +
                  operationName.slice(1),
                description: `${operationName} operation for ${serviceName.toUpperCase()}`,
              };
            })
            .sort((a, b) => a.operation.localeCompare(b.operation));

          return {
            service: serviceName,
            packageName,
            availableOperations: commands,
            count: commands.length,
            usage: `Use aws:general:execute-command with service="${serviceName}" and operation="<operationName>"`,
          };
        } catch (error) {
          throw new Error(
            `Failed to describe operations: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
    }),
  ];
}

import type { Tool } from "../tool";
import type { AWSConfig } from "./auth";
import { createEC2Tools } from "./tools/ec2";
import { createS3Tools } from "./tools/s3";
import { createIAMTools } from "./tools/iam";
import { createLambdaTools } from "./tools/lambda";
import { createDynamoDBTools } from "./tools/dynamodb";
import { createCloudWatchTools } from "./tools/cloudwatch";
import { createSQSTools } from "./tools/sqs";
import { createCostTools } from "./tools/cost";
import { createGeneralAWSTools } from "./tools/general";

export { type AWSConfig } from "./auth";

export interface CreateAWSToolsOptions extends AWSConfig {
  services?: {
    // Infrastructure
    ec2?: boolean;
    s3?: boolean;
    iam?: boolean;

    // Serverless
    lambda?: boolean;
    dynamodb?: boolean;
    sqs?: boolean;

    // Monitoring & Cost
    cloudwatch?: boolean;
    cost?: boolean;

    // General AWS CLI
    general?: boolean;
  };
}

export function createAWSTools(options: CreateAWSToolsOptions = {}): Tool[] {
  const tools: Tool[] = [];

  const services = options.services || {
    // Infrastructure (default enabled)
    ec2: true,
    s3: true,
    iam: true,

    // Serverless (default enabled)
    lambda: true,
    dynamodb: true,
    sqs: true,

    // Monitoring & Cost (default enabled)
    cloudwatch: true,
    cost: true,

    // General AWS CLI (default enabled)
    general: true,
  };

  // Infrastructure services
  if (services.ec2) {
    tools.push(...createEC2Tools(options));
  }

  if (services.s3) {
    tools.push(...createS3Tools(options));
  }

  if (services.iam) {
    tools.push(...createIAMTools(options));
  }

  // Serverless services
  if (services.lambda) {
    tools.push(...createLambdaTools(options));
  }

  if (services.dynamodb) {
    tools.push(...createDynamoDBTools(options));
  }

  if (services.sqs) {
    tools.push(...createSQSTools(options));
  }

  // Monitoring & Cost
  if (services.cloudwatch) {
    tools.push(...createCloudWatchTools(options));
  }

  if (services.cost) {
    tools.push(...createCostTools(options));
  }

  // General AWS CLI
  if (services.general) {
    tools.push(...createGeneralAWSTools(options));
  }

  return tools;
}

import { type Tool } from "../utils/tool"
import { createCloudFrontTools } from "./cloudfront"
import { createCloudWatchTools } from "./cloudwatch"
import { createCostTools } from "./cost"
import { createEC2Tools } from "./ec2"
import { createECSTools } from "./ecs"
import { createLambdaTools } from "./lambda"
import { createRDSTools } from "./rds"
import { createS3Tools } from "./s3"
import { createSQSTools } from "./sqs"

export const tools: Tool[] = [
  createCostTools(),
  createCloudWatchTools(),
  createS3Tools(),
  createCloudFrontTools(),
  createEC2Tools(),
  createECSTools(),
  createLambdaTools(),
  createRDSTools(),
  createSQSTools(),
].flatMap((tools) => tools)

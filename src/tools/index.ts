import { type Tool } from "../utils/tool"
import { createCloudFrontTools } from "./cloudfront"
import { createCloudWatchTools } from "./cloudwatch"
import { createCostTools } from "./cost"
import { createECSTools } from "./ecs"
import { createS3Tools } from "./s3"

export const tools: Tool[] = [
  ...createCostTools(),
  ...createCloudWatchTools(),
  ...createS3Tools(),
  ...createCloudFrontTools(),
  ...createECSTools(),
]

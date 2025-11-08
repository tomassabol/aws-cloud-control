import { type Tool } from "../utils/tool"
import { createCloudWatchTools } from "./cloudwatch"
import { createCostTools } from "./cost"
import { createS3Tools } from "./s3"

export const tools: Tool[] = [
  ...createCostTools(),
  ...createCloudWatchTools(),
  ...createS3Tools(),
]

import { type Tool } from "../utils/tool"
import { createCloudWatchTools } from "./cloudwatch"
import { createCostTools } from "./cost"

export const tools: Tool[] = [...createCostTools(), ...createCloudWatchTools()]

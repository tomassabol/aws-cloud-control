import { logger } from "@tomassabol/aws-common/utils/logger"
import { type HandlerFunction } from "@tomassabol/lambda-api"

import { tools } from "~/tools"

import { createMcp } from "./lib/create-mcp"

export const mcpHandler: HandlerFunction = async (req) => {
  try {
    const result = await createMcp({ tools }).process(req.body)

    // Notifications don't require a response, return 204 No Content
    if (result === null) {
      return { statusCode: 204 }
    }

    return result
  } catch (error) {
    logger.error("Error processing MCP request", { error })

    return {
      jsonrpc: "2.0",
      id: req.body.id,
      error: {
        code: -32602,
        message: "Internal Server Error",
      },
    }
  }
}

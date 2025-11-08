import { type HandlerFunction } from "@tomassabol/lambda-api"

import { tools } from "~/tools"

import { createMcp } from "./lib/create-mcp"

export const mcpHandler: HandlerFunction = async (req) => {
  const result = await createMcp({ tools }).process(req.body)

  // Notifications don't require a response, return 204 No Content
  if (result === null) {
    return { statusCode: 204 }
  }

  return result
}

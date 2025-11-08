import { type API } from "@tomassabol/lambda-api"

import { mcpHandler } from "../app/mcp/mcp"

/**
 * API routes for MCP server
 *
 * @example
 * ```typescript
 * const api = createAPI()
 * api.register(mcpRoutes)
 * ```
 */

export const mcpRoutes = (api: API) => {
  api.post("/mcp", mcpHandler)
}

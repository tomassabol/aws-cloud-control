import "./service-name"

import { logger } from "@tomassabol/aws-common/utils/logger"
import { createApiHandler, type Routes } from "@tomassabol/lambda-api-toolkit"

import { mcpRoutes } from "../../api/mcp-routes"

const routes: Array<Routes> = [mcpRoutes] as const

export const handler = createApiHandler(routes, { logger })

import {
  CallToolRequestSchema,
  type CallToolResult,
  InitializeRequestSchema,
  type InitializeResult,
  isJSONRPCNotification,
  type JSONRPCNotification,
  type JSONRPCRequest,
  type JSONRPCResponse,
  ListToolsRequestSchema,
  type ListToolsResult,
  // eslint-disable-next-line import/no-unresolved
} from "@modelcontextprotocol/sdk/types.js"
import { z } from "zod"
import { type JsonSchema7ObjectType, zodToJsonSchema } from "zod-to-json-schema"

import { type Tool } from "../../../utils/tool"

const RequestSchema = z.union([
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
])
type RequestSchema = z.infer<typeof RequestSchema>

export function createMcp(input: { tools: Tool[] }) {
  return {
    async process(
      message: JSONRPCRequest | JSONRPCNotification,
    ): Promise<JSONRPCResponse | null> {
      // Handle notifications (they don't have an id field and don't require a response)
      if (isJSONRPCNotification(message)) {
        return null
      }

      const parsed = RequestSchema.parse(message)

      const result = await (async () => {
        if (parsed.method === "initialize")
          return {
            protocolVersion: "2025-06-18",
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: "aws-cloudcontrol",
              version: "1.0.0",
            },
          } satisfies InitializeResult

        if (parsed.method === "tools/list") {
          return {
            tools: input.tools.map((tool) => ({
              name: tool.name,
              inputSchema: zodToJsonSchema(tool.args || z.object({}), "args")
                .definitions!.args as JsonSchema7ObjectType,
              description: tool.description,
            })),
          } satisfies ListToolsResult
        }

        if (parsed.method === "tools/call") {
          const tool = input.tools.find(
            (tool) => tool.name === parsed.params.name,
          )
          if (!tool) throw new Error("tool not found")

          let args = parsed.params.arguments
          if (tool.args) {
            const validated = await tool.args["~standard"].validate(args)
            if (validated.issues) {
              return {
                isError: true,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(validated.issues),
                  },
                ],
              } satisfies CallToolResult
            }
            args = validated.value
          }

          return tool
            .run(args)
            .catch(
              (error: Error) =>
                ({
                  isError: true,
                  content: [
                    {
                      type: "text",
                      text: error.message,
                    },
                  ],
                }) satisfies CallToolResult,
            )
            .then(
              (result: unknown) =>
                ({
                  content: [
                    {
                      type: "text",
                      text: JSON.stringify(result, null, 2),
                    },
                  ],
                }) satisfies CallToolResult,
            )
        }

        throw new Error("not implemented")
      })()

      return {
        jsonrpc: "2.0",
        id: (message as JSONRPCRequest).id,
        result,
      } satisfies JSONRPCResponse
    },
  }
}

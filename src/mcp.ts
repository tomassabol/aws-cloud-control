import type {
  CallToolResult,
  InitializeResult,
  JSONRPCRequest,
  JSONRPCResponse,
  ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { Tool } from "./tool";
import { zodToJsonSchema } from "zod-to-json-schema";
import { RequestSchema } from "./schemas/mcp-schemas";

export const createMcpServer = ({ tools }: { tools: Tool[] }) => {
  return {
    async process(request: JSONRPCRequest): Promise<JSONRPCResponse> {
      try {
        const parsed = RequestSchema.parse(request);

        switch (parsed.method) {
          case "initialize":
            return {
              jsonrpc: "2.0",
              id: parsed.id,
              result: {
                protocolVersion: "2024-11-05",
                capabilities: {
                  tools: {},
                },
                serverInfo: {
                  name: "cloudcontrol",
                  version: "1.0.0",
                },
              } satisfies InitializeResult,
            };

          case "tools/list":
            return {
              jsonrpc: "2.0",
              id: parsed.id,
              result: {
                tools: tools.map((tool: Tool) => ({
                  name: tool.name,
                  description: tool.description,
                  inputSchema: tool.args
                    ? (zodToJsonSchema(tool.args as z.ZodSchema) as any)
                    : undefined,
                })),
              } satisfies ListToolsResult,
            };

          case "tools/call":
            const tool = tools.find((t: Tool) => t.name === parsed.params.name);
            if (!tool) {
              return {
                jsonrpc: "2.0",
                id: parsed.id,
                error: {
                  code: -32601,
                  message: `Tool not found: ${parsed.params.name}`,
                },
              } as unknown as JSONRPCResponse;
            }

            try {
              const result = tool.args
                ? await tool.run(parsed.params.arguments || {})
                : await tool.run({});

              return {
                jsonrpc: "2.0",
                id: parsed.id,
                result: {
                  content: [
                    {
                      type: "text",
                      text:
                        typeof result === "string"
                          ? result
                          : JSON.stringify(result),
                    },
                  ],
                } satisfies CallToolResult,
              };
            } catch (error) {
              return {
                jsonrpc: "2.0",
                id: parsed.id,
                error: {
                  code: -32603,
                  message: `Tool execution failed: ${
                    error instanceof Error ? error.message : String(error)
                  }`,
                },
              } as unknown as JSONRPCResponse;
            }

          default:
            return {
              jsonrpc: "2.0",
              id: request.id || 0,
              error: {
                code: -32601,
                message: "Method not found",
              },
            } as unknown as JSONRPCResponse;
        }
      } catch (error) {
        return {
          jsonrpc: "2.0",
          id: "id" in request && request.id !== undefined ? request.id : 0,
          error: {
            code: -32600,
            message: "Invalid Request",
            data: error instanceof Error ? error.message : String(error),
          },
        } as unknown as JSONRPCResponse;
      }
    },
  };
};

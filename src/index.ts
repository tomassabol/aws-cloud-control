import { Hono } from "hono";
import type { Tool } from "./tool";
import { createMcpServer } from "./mcp";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import {
  APICallError,
  type LanguageModel,
  generateText,
  tool as aiTool,
} from "ai";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";
import { HTTPException } from "hono/http-exception";

export type CloudControlOptions = {
  tools: Tool[];
  password?: string;
  model?: LanguageModel;
  app?: Hono;
  disableAuth?: boolean;
};

export type App = ReturnType<typeof create>;

export function create(input: CloudControlOptions) {
  const mcp = createMcpServer({ tools: input.tools });

  // Convert ALL AWS tools to AI SDK format
  const aiTools: Record<string, any> = {};

  input.tools.forEach((mcpTool) => {
    // Convert tool name to be compatible with OpenAI (replace colons with underscores)
    const aiToolName = mcpTool.name.replace(/:/g, "_");

    // Create proper inputSchema - use the tool's args if available, otherwise empty object
    const schema = mcpTool.args ? (mcpTool.args as z.ZodSchema) : z.object({});

    aiTools[aiToolName] = {
      description: mcpTool.description,
      inputSchema: schema,
      execute: async (params: any) => {
        try {
          const result = await mcpTool.run(params || {});
          return typeof result === "string"
            ? result
            : JSON.stringify(result, null, 2);
        } catch (error) {
          return `Error executing ${mcpTool.name}: ${error}`;
        }
      },
    };
  });

  const app = input.app ?? new Hono();

  const baseApp = app.use(
    cors({
      origin: "*",
      allowHeaders: ["*"],
      allowMethods: ["GET"],
      credentials: false,
    })
  );

  return baseApp
    .post(
      "/generate",
      zValidator(
        "json",
        z.object({
          prompt: z.string(),
          maxTokens: z.number().optional(),
          temperature: z.number().optional(),
        })
      ),
      async (c) => {
        if (!input.model)
          throw new HTTPException(400, { message: "No model configured" });
        const body = c.req.valid("json");
        try {
          const result = await generateText({
            model: input.model,
            prompt: body.prompt,
            tools: aiTools,
            ...(body.maxTokens && { maxTokens: body.maxTokens }),
            ...(body.temperature && { temperature: body.temperature }),
          });

          return c.json(result);
        } catch (error) {
          console.error(error);
          if (error instanceof APICallError) {
            throw new HTTPException(error.statusCode || (500 as any), {
              message: "error",
            });
          }
          throw new HTTPException(500, { message: "error" });
        }
      }
    )
    .post("/mcp", async (c) => {
      const body = await c.req.json();
      const result = await mcp.process(body);
      return c.json(result);
    });
}

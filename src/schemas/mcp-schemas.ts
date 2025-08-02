import { z } from "zod";

export const InitializeRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.literal("initialize"),
  params: z.object({
    protocolVersion: z.string(),
    capabilities: z.object({}).passthrough(),
    clientInfo: z.object({
      name: z.string(),
      version: z.string(),
    }),
  }),
});

export const ListToolsRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.literal("tools/list"),
  params: z.object({}).optional(),
});

export const CallToolRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.literal("tools/call"),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.any()).optional(),
  }),
});

export const RequestSchema = z.union([
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
]);

export type RequestSchema = z.infer<typeof RequestSchema>;

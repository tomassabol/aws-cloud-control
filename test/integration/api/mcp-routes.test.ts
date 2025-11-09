import {
  type JSONRPCResponse,
  type JSONRPCRequest,
} from "@modelcontextprotocol/sdk/types.js"
import { app } from "~/dev"
import { tools } from "~/tools"

describe("POST /mcp", () => {
  test("should handle initialize request", async () => {
    const response = await app.request("http://localhost:3000/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
      } satisfies JSONRPCRequest),
    })
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 1,
      result: {
        protocolVersion: "2025-06-18",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "aws-cloudcontrol",
          version: "1.0.0",
        },
      },
    })
  })

  test("should handle tools/list request", async () => {
    const response = await app.request("http://localhost:3000/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      } satisfies JSONRPCRequest),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as JSONRPCResponse
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 2,
      result: {},
    })
    expect(body.result).toHaveProperty("tools")
    expect(
      Array.isArray(body.result.tools) && body.result.tools.length,
    ).toEqual(tools.length)
  })

  test("should return error for invalid method", async () => {
    const response = await app.request("http://localhost:3000/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 3,
        method: "invalid",
      } satisfies JSONRPCRequest),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as JSONRPCResponse
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 3,
      error: { code: -32602, message: "Internal Server Error" },
    })
  })

  test("should return error for unsupported jsonrpc version", async () => {
    const response = await app.request("http://localhost:3000/mcp", {
      method: "POST",
      body: JSON.stringify({
        // @ts-expect-error - invalid jsonrpc version
        jsonrpc: "1.0",
        id: 4,
        method: "initialize",
      } satisfies JSONRPCRequest),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as JSONRPCResponse

    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: 4,
      error: { code: -32602, message: "Internal Server Error" },
    })
  })

  test("should return an error for invalid request id", async () => {
    const response = await app.request("http://localhost:3000/mcp", {
      method: "POST",
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "invalid",
        method: "initialize",
      } satisfies JSONRPCRequest),
    })
    expect(response.status).toBe(200)
    const body = (await response.json()) as JSONRPCResponse
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      id: "invalid",
      error: { code: -32602, message: "Internal Server Error" },
    })
  })
})

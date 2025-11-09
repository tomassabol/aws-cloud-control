/* eslint-disable no-console */
import { Hono } from "hono"

import { createMcp } from "./app/mcp/lib/create-mcp"
import { tools } from "./tools"

export type HonoApp = typeof app

export const app = new Hono().post("/mcp", async (c) => {
  const body = await c.req.json()

  try {
    const result = await createMcp({ tools }).process(body)

    if (result === null) {
      return c.json({ statusCode: 204 })
    }

    return c.json(result)
  } catch (error) {
    return c.json({
      jsonrpc: "2.0",
      id: body.id,
      error: {
        code: -32602,
        message: "Internal Server Error",
      },
    })
  }
})

// Only start the server when running directly with Bun (not when imported by tests)
if (typeof Bun !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  import("bun").then(({ serve }) => {
    serve({ port: 3000, fetch: app.fetch, development: true })
  })
}

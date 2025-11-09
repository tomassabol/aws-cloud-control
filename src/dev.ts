/* eslint-disable no-console */
import * as Bun from "bun"
import { Hono } from "hono"

import { createMcp } from "./app/mcp/lib/create-mcp"
import { tools } from "./tools"

if (process.env.NODE_ENV === "development") {
  const app = new Hono().post("/mcp", async (c) => {
    const body = await c.req.json()
    const result = await createMcp({ tools }).process(body)

    if (result === null) {
      return c.json({ statusCode: 204 })
    }

    return c.json(result)
  })

  console.log("Starting development server on port 3000")
  Bun.serve({ port: 3000, fetch: app.fetch, development: true })
}

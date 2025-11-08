export class ToolError extends Error {
  public readonly toolName?: string
  public readonly toolArgs?: Record<string, unknown>

  constructor({
    message,
    error = "Tool execution failed",
    toolName,
    toolArgs,
  }: {
    message?: string
    error?: unknown
    toolName?: string
    toolArgs?: Record<string, unknown>
  }) {
    const errorMessage =
      message ?? (error instanceof Error ? error.message : String(error))

    super(errorMessage, { cause: error })
    this.name = "ToolError"
    this.toolName = toolName
    this.toolArgs = toolArgs
  }
}

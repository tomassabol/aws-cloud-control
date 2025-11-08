import { type Tool } from "../utils/tool"

export type ErrorApiResponse = {
  /**
   * Error message
   */
  error: string

  /**
   * Details about the error
   */
  details?: unknown

  /**
   * AWS Request ID, can be used to search CloudWatch logs for more details
   */
  requestId?: string
}

export type SuccessApiResponse = {
  message: string
}

export type MCPRequest = {
  tools: Tool[]
}

import {
  type JSONRPCNotification,
  type JSONRPCRequest,
  type JSONRPCResponse,
} from "@modelcontextprotocol/sdk/types.js"

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

export type MCPRequest = JSONRPCRequest | JSONRPCNotification
export type MCPResponse = JSONRPCResponse | null

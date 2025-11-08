import type { Request } from "@tomassabol/lambda-api"
import { ApiError } from "@tomassabol/lambda-api-toolkit"

/**
 * Get getDeadlineParamsFromQuery from path parameters with validation
 *
 * @throws {ApiError} if a provided parameter is not a non-empty string
 *
 * @example
 * ```typescript
 * const
 * const { shippingMethod, storeId } = getDeadlineParamsFromQuery(req.query)
 * ```
 */

export function getDeadlineParamsFromQuery(query?: Request["query"]) {
  return {
    shippingMethod: getOptionalStringParam(
      query?.shippingMethod,
      "shippingMethod",
    ),
    storeId: getOptionalStringParam(query?.storeId, "storeId"),
  }
}

function getOptionalStringParam(
  value: unknown,
  paramName: "shippingMethod" | "storeId",
) {
  if (value === undefined) {
    return undefined
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(
      400,
      `Query parameter "${paramName}" must be a non-empty string`,
    )
  }

  return value
}

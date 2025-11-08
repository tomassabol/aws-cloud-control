import type { Request } from "@tomassabol/lambda-api"
import { ApiError } from "@tomassabol/lambda-api-toolkit"

export function getDeadlineIdFromParams(params?: Request["param"]) {
  const deadlineId = params?.deadlineId
  const isValidDeadlineId = deadlineId && typeof deadlineId === "string"

  if (!isValidDeadlineId) {
    throw new ApiError(400, "Invalid or missing deadlineId url parameter")
  }

  return deadlineId
}

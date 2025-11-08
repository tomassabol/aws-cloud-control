/**
 * Set X-Ray and metrics service name.
 *
 * NOTE:
 * Must be the first import in the lambda handler
 */

import { setServiceName } from "@tomassabol/aws-common/lambda/service-name"

setServiceName("api")

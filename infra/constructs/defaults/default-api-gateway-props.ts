import type { RestApiSimplePatternProps } from "@tomassabol/cdk-template"
import * as apigateway from "aws-cdk-lib/aws-apigateway"

export const DEFAULT_API_GATEWAY_PROPS: RestApiSimplePatternProps = {
  useDefaultCors: true,
  defaultMethodOptions: {
    apiKeyRequired: true,
  },
  usagePlanOptions: {
    quota: {
      limit: 2000000,
      period: apigateway.Period.DAY,
    },
    throttle: {
      rateLimit: 300,
      burstLimit: 200,
    },
  },
}

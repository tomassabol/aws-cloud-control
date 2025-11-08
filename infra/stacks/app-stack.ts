import {
  type AppContext,
  BaseStack,
  type StackConfig,
} from "@tomassabol/cdk-template";

import { RestApiGateway } from "../constructs/api-getways/rest-api-gateway";
import { ApiFunction } from "../constructs/functions/api/api-function";

export class AppStack extends BaseStack {
  constructor(appContext: AppContext, stackConfig: StackConfig) {
    super(appContext, stackConfig, {
      description: `AWS CloudControl MCP Server - [${appContext.stageName}]`,
    });

    /**
     * API Gateway
     */

    const { function: apiFunction } = new ApiFunction(this, "api-function");

    new RestApiGateway(this, "api-gateway", { apiFunction });
  }
}

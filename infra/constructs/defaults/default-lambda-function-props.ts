import {
  type IBaseConstruct,
  type NodeJsFunctionSimplePatternProps,
} from "@tomassabol/cdk-template"
import * as lambda from "aws-cdk-lib/aws-lambda"
import { RetentionDays } from "aws-cdk-lib/aws-logs"

/**
 * Create args for NodeJsFunctionSimplePattern construct with default props
 *
 * @example
 * ```typescript
 * const lambda = new NodeJsFunctionSimplePattern(
 *   ...defaultNodeJsFunctionSimplePatternArgs(this, id, { ... })
 * )
 * ```
 */

export const defaultNodeJsFunctionSimplePatternArgs = (
  scope: IBaseConstruct,
  id: string,
  props: NodeJsFunctionSimplePatternProps,
): [IBaseConstruct, string, NodeJsFunctionSimplePatternProps] => {
  return [scope, id, defaultNodeJsFunctionSimplePatternProps(scope, props)]
}

/**
 * Default props for NodeJsFunctionSimplePattern
 */

export const defaultNodeJsFunctionSimplePatternProps = (
  scope: IBaseConstruct,
  props: NodeJsFunctionSimplePatternProps,
): NodeJsFunctionSimplePatternProps => {
  const isProduction = scope.stageName === "prod"

  const { bundling, environment, ...restProps } = props // Hoist props which will be merged separately

  return {
    runtime: lambda.Runtime.NODEJS_22_X,
    warmUp: isProduction,
    logRetention: RetentionDays.THREE_MONTHS,
    bundling: {
      sourceMap: true,
      externalModules: ["@aws-sdk", "@aws-lambda-powertools"],
      metafile: true, // To support bundle size visualization, see https://github.com/adriencaccia/cdk-bundle-analyzer
      ...bundling,
    },
    environment: {
      STAGE: scope.stageName,
      ...environment,
    },
    ...restProps,
  }
}

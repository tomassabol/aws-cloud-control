import { type IBaseConstruct } from "@tomassabol/cdk-template"
import * as cdk from "aws-cdk-lib"
import * as dynamodb from "aws-cdk-lib/aws-dynamodb"

/**
 * Create args for DynamoDB Table construct with default props
 *
 * @example
 * ```typescript
 * const table = new dynamodb.Table(
 *   ...defaultDynamoDbTableArgs(this, id, { ... }))
 * )
 * ```
 */

export const defaultDynamoDbTableArgs = (
  scope: IBaseConstruct,
  id: string,
  props: dynamodb.TableProps,
): [IBaseConstruct, string, dynamodb.TableProps] => {
  return [scope, id, defaultDynamoDbTableProps(scope, id, props)]
}

/**
 * Create default props for DynamoDB Table
 */

const defaultDynamoDbTableProps = (
  scope: IBaseConstruct,
  id: string,
  props: dynamodb.TableProps,
): dynamodb.TableProps => {
  const defaultOptions: Partial<dynamodb.TableProps> = {
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    tableName: scope.createResourceName(id, "table"),
  }

  const stageOptions: Record<string, Partial<dynamodb.TableProps>> = {
    prod: {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    },
  }

  return {
    ...defaultOptions,
    ...stageOptions[scope.stageName],
    ...props,
  }
}

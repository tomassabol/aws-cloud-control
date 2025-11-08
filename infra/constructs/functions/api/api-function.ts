import {
  BaseConstruct,
  grantAppConfigAccess,
  type IBaseConstruct,
  NodeJsFunctionSimplePattern,
} from "@tomassabol/cdk-template"
import * as cdk from "aws-cdk-lib"
import * as iam from "aws-cdk-lib/aws-iam"
import type * as lambda from "aws-cdk-lib/aws-lambda"

import { defaultNodeJsFunctionSimplePatternArgs } from "../../defaults/default-lambda-function-props"

export class ApiFunction extends BaseConstruct {
  public function: lambda.Function

  constructor(scope: IBaseConstruct, id: string) {
    super(scope, id)

    const { lambdaFunction } = new NodeJsFunctionSimplePattern(
      ...defaultNodeJsFunctionSimplePatternArgs(this, id, {
        description: "API",
        entry: "src/functions/api/api-function.ts",
        timeout: cdk.Duration.minutes(1),
      }),
    )
    this.function = lambdaFunction

    grantAppConfigAccess(this.function)

    this.function.role?.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName("ReadOnlyAccess"),
    )
  }
}

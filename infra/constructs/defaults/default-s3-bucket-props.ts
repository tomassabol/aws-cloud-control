import { type IBaseConstruct } from "@tomassabol/cdk-template"
import * as cdk from "aws-cdk-lib"
import * as s3 from "aws-cdk-lib/aws-s3"

/**
 * Create args for S3 Bucket construct with default props
 *
 * @example
 * ```typescript
 * const bucket = new s3.Bucket(
 *   ...defaultS3BucketArgs(this, id, { ... }))
 * )
 * ```
 */

export const defaultS3BucketArgs = (
  scope: IBaseConstruct,
  id: string,
  props: s3.BucketProps,
): [IBaseConstruct, string, s3.BucketProps] => {
  return [scope, id, defaultS3BucketProps(scope, id, props)]
}

/**
 * Create default props for S3 Bucket
 */

const defaultS3BucketProps = (
  scope: IBaseConstruct,
  id: string,
  props: s3.BucketProps,
): s3.BucketProps => {
  const defaultOptions: Partial<s3.BucketProps> = {
    removalPolicy: cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: true,
    bucketName: scope.createResourceName(id, "bucket"),
    versioned: false,
    encryption: s3.BucketEncryption.S3_MANAGED,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  }

  const stageOptions: Record<string, Partial<s3.BucketProps>> = {
    prod: {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      versioned: true,
    },
  }

  return {
    ...defaultOptions,
    ...stageOptions[scope.stageName],
    ...props,
  }
}

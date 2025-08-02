import {
  fromEnv,
  fromIni,
  fromInstanceMetadata,
} from "@aws-sdk/credential-providers";
import type {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
} from "@aws-sdk/types";

export interface AWSConfig {
  region?: string;
  credentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider;
  profile?: string;
}

export function createAWSCredentials(
  config?: AWSConfig
): AwsCredentialIdentityProvider {
  // Priority order: explicit credentials > profile > env vars > instance metadata
  if (config?.credentials) {
    if (typeof config.credentials === "function") {
      return config.credentials;
    }
    return async () => config.credentials as AwsCredentialIdentity;
  }

  if (config?.profile) {
    return fromIni({ profile: config.profile });
  }

  // Chain fallback: env vars -> instance metadata
  return async () => {
    try {
      return await fromEnv()();
    } catch (envError) {
      try {
        return await fromInstanceMetadata()();
      } catch (metadataError) {
        throw new Error(
          `Unable to load AWS credentials. Tried environment variables and instance metadata. ` +
            `Original errors: ENV: ${
              envError instanceof Error ? envError.message : String(envError)
            }, ` +
            `METADATA: ${
              metadataError instanceof Error
                ? metadataError.message
                : String(metadataError)
            }`
        );
      }
    }
  };
}

export function getAWSRegion(config?: AWSConfig): string {
  return (
    config?.region ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    "eu-central-1"
  );
}

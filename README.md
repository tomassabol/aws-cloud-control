# cloudcontrol

## Quick start

### Configure API key

Before deployment, the application API key must be created within the AWS Secrets Manager.
The intention is fix the value API key in order to prevent changing the API key in case that
the API Gateway is recreated.

```sh
aws secretsmanager \
  create-secret \
  --profile {AWS_PROFILE} \
  --name {STAGE}/aws-cloudcontrol/api-key \
  --description 'API key for aws cloud-control API' \
  --secret-string 'some api key'
```

## Installation

```
npm install
```

## Deployment

Application

```
./scripts/cdk.sh deploy app --profile <AWS-PROFILE> --stage <STAGE>
```

Deployment pipeline

```
./scripts/cdk.sh deploy app-pipeline --profile <AWS-PROFILE> --stage <STAGE>
```

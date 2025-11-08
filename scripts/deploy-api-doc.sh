#!/bin/bash
#
# Deploy API Documentation to S3 bucket
#

API_NAME="lambda-api"

ROOT="$(dirname $0)/.."
BUILD_DIR=${ROOT}/docs/api/.build
PROFILE=gb-prod
BUCKET=gb-api-documentation

echo ">> Building API documentation"
echo
$ROOT/scripts/build-api-doc.sh
if [ $? != 0 ]; then
  exit 1
fi

echo
echo ">> Deploying API documentation to bucket ${BUCKET}"
echo
aws s3 cp --recursive --profile ${PROFILE} ${BUILD_DIR} s3://${BUCKET}/${API_NAME}

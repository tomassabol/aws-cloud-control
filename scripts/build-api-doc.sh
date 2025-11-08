#!/bin/bash
#
# Build API Documentation
#

ROOT=$(dirname $0)/..
API_FOLDER=$ROOT/docs/api
BUILD_FOLDER=$API_FOLDER/.build


rm -rf $BUILD_FOLDER
mkdir -p $BUILD_FOLDER

$ROOT/scripts/create-json-schemas.sh
if [ $? != 0 ]; then
  exit 1
fi

cp -R $API_FOLDER/api.openapi.yaml $API_FOLDER/schemas $API_FOLDER/template/* $BUILD_FOLDER
if [ $? != 0 ]; then
  exit 1
fi

echo API documentation bundled into $BUILD_FOLDER

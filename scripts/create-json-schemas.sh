#!/bin/bash
#
# Generate JSON schemas from typescript source code
#

# List of schemas

SCHEMAS="\
  ErrorApiResponse \
  SuccessApiResponse \
  GetShippingDeadlinesApiResponse \
  CreateShippingDeadlineApiRequest \
  CreateShippingDeadlineApiResponse \
  UpdateShippingDeadlineApiRequest \
  UpdateShippingDeadlineApiResponse \
  "

ROOT=$(dirname $0)/..
SOURCE="$ROOT/tsconfig.json"
# SOURCE="$ROOT/src/api/types.ts" # Use specific file to speed up generation

DESTINATION_PATH="$ROOT/docs/api/schemas"

TSJ="npx typescript-json-schema"
TSJ_OPTIONS="--required --no-refs --noExtraProps --ignoreErrors"
STRIP="node $ROOT/scripts/strip-schema.js"

# Schemas can be provided also as arguments

if [[ $# > 0 ]]; then
  # Check that args are valid schemas
  for ARG in $*; do
    if [[ $(echo "$SCHEMAS" | grep "$ARG") == "" ]]; then
      echo "Schema $ARG is not supported"
      exit 1
    fi
  done

  SCHEMAS=$*
else
  # If schemas were not provided as argument then clean up output dir before creating all schemas
  rm $DESTINATION_PATH/*.json
  mkdir -p $DESTINATION_PATH
fi

# Create each schema from TypeScript type
for SCHEMA in $SCHEMAS; do
  echo Generating JSON schema for $SCHEMA
  $TSJ $SOURCE $SCHEMA $TSJ_OPTIONS | $STRIP > $DESTINATION_PATH/$SCHEMA.json
  if [ $? != 0 ]; then
    exit 1
  fi
done

npx prettier -w $DESTINATION_PATH

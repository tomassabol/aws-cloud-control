#!/bin/bash

HOMEDIR=$(dirname $0)
ROOTDIR="$HOMEDIR/.."
VERSION=v1
VALID_STACKS="app app-pipeline config-pipeline"
PROJECT_NAME="aws-cloudcontrol"

print_usage() {
  echo "Usage:"
  echo
  echo "cdk.sh [options] stack-name ..."
  echo
  echo "stack-name can be app, app-pipeline or config-pipeline"
  echo
  echo "Options:"
  echo
  echo "  deploy          deploy stacks"
  echo "  destroy         destroy stacks"
  echo "  remove          alias to destroy"
  echo "  synth           synthetize stacks"
  echo "  diff            diff stacks"
  echo "  -p, --profile   set AWS profile"
  echo "  -s, --stage     set deployment stage"
}

is_valid_stack() {
  STACK="$1"
  IS_VALID_STACK=0
  for w in $VALID_STACKS; do
    if [ "$w" == "$STACK" ]; then
      IS_VALID_STACK=1
      break
    fi
  done
  echo $IS_VALID_STACK
}

if [[ -z "$STAGE" ]]; then
  STAGE="$DEFAULT_STAGE"
fi

STACKS=""

while [ "$#" -gt 0 ]; do
  case "$1" in

    --profile | -p)
      PROFILE="--profile $2"
      shift
      shift
      ;;
    --stage | -s)
      STAGE=$2
      shift
      shift
      ;;
    deploy)
      CMD="deploy"
      shift
      ;;
    destroy | remove)
      CMD="destroy"
      shift
      ;;
    synth)
      CMD="synth"
      shift
      ;;      
    diff)
      CMD="diff"
      shift
      ;;      
    *)
      if [[ $(is_valid_stack $1) == 0 ]]; then
        echo "Invalid param: $1"
        print_usage
        exit 2
      fi
      STACKS="$STACKS $1"
      shift
      ;;
  esac
done

if [[ -z $CMD ]]; then
  print_usage
  exit 2
fi

if [ "$STAGE" == "" ]; then
  echo "Stage is not defined"
  print_usage
  exit 2
fi

cd "$ROOTDIR"

for STACK in $STACKS; do

  if [[ $STACK == "app" ]]; then
    echo
    echo cdk $CMD --context "APP_CONFIG=infra/config/app-config-${STAGE}.json" $PROFILE --all
    echo
    cdk $CMD --context "APP_CONFIG=infra/config/app-config-${STAGE}.json" $PROFILE --all
  else
    echo
    echo cdk $CMD --context "APP_CONFIG=infra/config/devops-config-${STAGE}.json" $PROFILE $PROJECT_NAME-devops-$STACK-$STAGE
    echo
    cdk $CMD --context "APP_CONFIG=infra/config/devops-config-${STAGE}.json" $PROFILE $PROJECT_NAME-devops-$STACK-$STAGE
  fi
done

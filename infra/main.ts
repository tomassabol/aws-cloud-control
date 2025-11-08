#!/usr/bin/env node
/* eslint-disable no-console */
import "source-map-support/register"

import {
  AppContext,
  AppContextError,
  DevopsAppPipelineStack,
} from "@tomassabol/cdk-template"

import { AppStack } from "./stacks/app-stack"

/**
 * Main file for CDK deployment
 */

try {
  const appContext = new AppContext()

  DevopsAppPipelineStack.fromAppContext(appContext, "devops-app-pipeline")
  AppStack.fromAppContext(appContext, "app")
} catch (error) {
  console.error("\n")
  if (error instanceof AppContextError) {
    console.error("[AppContextError]:", error.message)
  } else {
    console.error(error)
  }
  process.exit(1)
}

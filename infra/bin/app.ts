#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";

import { AppStack } from "../lib/app-stack";
import { loadConfigFromEnv } from "../lib/config/types";

const app = new cdk.App();
const config = loadConfigFromEnv();

const account = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;
if (!account || !region) {
  throw new Error("AWS_ACCOUNT_ID and AWS_REGION are required to synthesize or deploy.");
}

new AppStack(app, `RunbookApi-${config.environmentName}`, {
  env: { account, region },
  config,
});

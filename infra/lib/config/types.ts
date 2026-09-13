import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { lambdaStubDir } from "../api/lambda-code";

export const environmentNames = ["local", "dev", "test", "prod"] as const;
export type EnvironmentName = (typeof environmentNames)[number];

export interface AppConfig {
  environmentName: EnvironmentName;
  entraTenantId: string;
  entraClientId: string;
  entraClientSecretSecretArn: string;
  cognitoDomainPrefix: string;
  frontendUrl: string;
  frontendCallbackUrl: string;
  frontendLogoutUrl: string;
  lambdaCode?: lambda.Code;
}

export function isProduction(config: AppConfig): boolean {
  return config.environmentName === "prod";
}

/** Stateful resources survive stack deletion in prod and are cleaned up everywhere else. */
export function removalPolicyFor(config: AppConfig): cdk.RemovalPolicy {
  return isProduction(config) ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isEnvironmentName(value: string): value is EnvironmentName {
  return (environmentNames as readonly string[]).includes(value);
}

export function parseEnvironmentName(value: string): EnvironmentName {
  if (!isEnvironmentName(value)) {
    throw new Error(
      `ENVIRONMENT_NAME must be one of ${environmentNames.join(", ")}; received "${value}".`,
    );
  }
  return value;
}

export function loadConfigFromEnv(): AppConfig {
  return {
    environmentName: parseEnvironmentName(requiredEnv("ENVIRONMENT_NAME")),
    entraTenantId: requiredEnv("ENTRA_TENANT_ID"),
    entraClientId: requiredEnv("ENTRA_CLIENT_ID"),
    entraClientSecretSecretArn: requiredEnv("ENTRA_CLIENT_SECRET_SECRET_ARN"),
    cognitoDomainPrefix: requiredEnv("COGNITO_DOMAIN_PREFIX"),
    frontendUrl: requiredEnv("FRONTEND_URL"),
    frontendCallbackUrl: requiredEnv("FRONTEND_CALLBACK_URL"),
    frontendLogoutUrl: requiredEnv("FRONTEND_LOGOUT_URL"),
    lambdaCode:
      process.env.CDK_LAMBDA_STUB === "1" ? lambda.Code.fromAsset(lambdaStubDir) : undefined,
  };
}

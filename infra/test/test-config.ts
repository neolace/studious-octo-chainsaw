import type { AppConfig } from "../lib/config/types";

/**
 * Placeholder values only. The ARN has to be well-formed because
 * `Secret.fromSecretCompleteArn` parses it; account `000000000000` and the
 * `PLACEHOLDER-000000` suffix make it self-evidently fake.
 */
export const testConfig: AppConfig = {
  environmentName: "dev",
  entraTenantId: "<ENTRA_TENANT_ID>",
  entraClientId: "<ENTRA_CLIENT_ID>",
  entraClientSecretSecretArn:
    "arn:aws:secretsmanager:us-east-1:000000000000:secret:PLACEHOLDER-000000",
  cognitoDomainPrefix: "runbook-auth-dev",
  frontendUrl: "http://localhost:5173",
  frontendCallbackUrl: "http://localhost:5173/auth/callback",
  frontendLogoutUrl: "http://localhost:5173/",
};

/** A prod-shaped variant: https origins, no localhost. */
export const prodTestConfig: AppConfig = {
  ...testConfig,
  environmentName: "prod",
  cognitoDomainPrefix: "runbook-auth-prod",
  frontendUrl: "https://runbooks.example.com",
  frontendCallbackUrl: "https://runbooks.example.com/auth/callback",
  frontendLogoutUrl: "https://runbooks.example.com/",
};

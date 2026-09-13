import { afterEach, describe, expect, test } from "vitest";

import { environmentNames, loadConfigFromEnv, parseEnvironmentName } from "../lib/config/types";

const requiredVars = {
  ENVIRONMENT_NAME: "dev",
  ENTRA_TENANT_ID: "<ENTRA_TENANT_ID>",
  ENTRA_CLIENT_ID: "<ENTRA_CLIENT_ID>",
  ENTRA_CLIENT_SECRET_SECRET_ARN:
    "arn:aws:secretsmanager:us-east-1:000000000000:secret:PLACEHOLDER-000000",
  COGNITO_DOMAIN_PREFIX: "runbook-auth-dev",
  FRONTEND_URL: "http://localhost:5173",
  FRONTEND_CALLBACK_URL: "http://localhost:5173/auth/callback",
  FRONTEND_LOGOUT_URL: "http://localhost:5173/",
};

const originalEnv = { ...process.env };

function setEnv(overrides: Partial<Record<keyof typeof requiredVars, string | undefined>> = {}) {
  for (const [name, value] of Object.entries({ ...requiredVars, ...overrides })) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("parseEnvironmentName", () => {
  test.each(environmentNames)("accepts %s", (name) => {
    expect(parseEnvironmentName(name)).toBe(name);
  });

  test("rejects unknown names", () => {
    expect(() => parseEnvironmentName("staging")).toThrow(/ENVIRONMENT_NAME must be one of/);
  });
});

describe("loadConfigFromEnv", () => {
  test("loads every required value", () => {
    setEnv();
    expect(loadConfigFromEnv()).toMatchObject({
      environmentName: "dev",
      entraTenantId: "<ENTRA_TENANT_ID>",
      cognitoDomainPrefix: "runbook-auth-dev",
    });
  });

  test.each(Object.keys(requiredVars))("fails fast when %s is missing", (name) => {
    setEnv({ [name]: undefined });
    expect(() => loadConfigFromEnv()).toThrow(new RegExp(name));
  });

  test("does not silently default the environment name", () => {
    setEnv({ ENVIRONMENT_NAME: "production" });
    expect(() => loadConfigFromEnv()).toThrow(/received "production"/);
  });
});

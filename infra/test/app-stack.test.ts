import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { describe, expect, test } from "vitest";

import { prodTestConfig, testConfig } from "./test-config";
import { lambdaStubDir } from "../lib/api/lambda-code";
import { AppStack } from "../lib/app-stack";
import type { AppConfig } from "../lib/config/types";

function synth(config: AppConfig = testConfig) {
  const app = new cdk.App();
  const stack = new AppStack(app, "Test", {
    env: { account: "000000000000", region: "us-east-1" },
    config: { ...config, lambdaCode: lambda.Code.fromAsset(lambdaStubDir) },
  });
  return Template.fromStack(stack);
}

describe("AppStack", () => {
  test("creates HTTP API with Cognito JWT authorizer", () => {
    const template = synth();
    template.resourceCountIs("AWS::ApiGatewayV2::Api", 1);
    template.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", {
      AuthorizerType: "JWT",
      IdentitySource: ["$request.header.Authorization"],
      JwtConfiguration: {
        Audience: [Match.anyValue()],
        Issuer: Match.anyValue(),
      },
    });
    expect(JSON.stringify(template.toJSON())).toContain("cognito-idp");
  });

  test("Lambda uses the managed dotnet10 runtime", () => {
    const template = synth();
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "dotnet10",
      Handler: "Web",
    });
  });

  test("every deployed Lambda runs the Production ASP.NET profile", () => {
    for (const config of [testConfig, prodTestConfig]) {
      synth(config).hasResourceProperties("AWS::Lambda::Function", {
        Environment: {
          Variables: Match.objectLike({
            ASPNETCORE_ENVIRONMENT: "Production",
            DEPLOYMENT_ENVIRONMENT: config.environmentName,
          }),
        },
      });
    }
  });

  test("protected routes require the JWT authorizer and OAuth scopes", () => {
    const template = synth();
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /v1/me",
      AuthorizationType: "JWT",
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /v1/runbooks",
      AuthorizationType: "JWT",
      AuthorizationScopes: ["runbook-api/read"],
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /v1/runbooks",
      AuthorizationType: "JWT",
      AuthorizationScopes: ["runbook-api/write"],
    });
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /v1/admin/{proxy+}",
      AuthorizationType: "JWT",
      AuthorizationScopes: ["runbook-api/admin"],
    });
  });

  test("health is unauthenticated", () => {
    const template = synth();
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /health",
      AuthorizationType: "NONE",
    });
  });

  test("production CORS is the configured https origin, not a wildcard", () => {
    const template = synth(prodTestConfig);
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      CorsConfiguration: {
        AllowOrigins: [prodTestConfig.frontendUrl],
      },
    });
    expect(JSON.stringify(template.toJSON())).not.toContain('"AllowOrigins":["*"]');
  });

  test("production rejects wildcard, http, and localhost frontend URLs at synth", () => {
    expect(() => synth({ ...prodTestConfig, frontendUrl: "*" })).toThrow(/wildcard/i);
    expect(() => synth({ ...prodTestConfig, frontendUrl: "http://runbooks.example.com" })).toThrow(
      /https/,
    );
    expect(() =>
      synth({ ...prodTestConfig, frontendCallbackUrl: "http://localhost:5173/auth/callback" }),
    ).not.toThrow();
    expect(() => synth({ ...prodTestConfig, frontendUrl: "http://localhost:5173" })).toThrow(
      /localhost/,
    );
  });

  test("stateful resources are retained only in prod", () => {
    synth().allResources("AWS::Cognito::UserPool", { DeletionPolicy: "Delete" });
    synth(prodTestConfig).allResources("AWS::Cognito::UserPool", { DeletionPolicy: "Retain" });
    synth(prodTestConfig).allResources("AWS::Logs::LogGroup", { DeletionPolicy: "Retain" });
  });

  test("log groups have retention", () => {
    const template = synth();
    template.allResourcesProperties("AWS::Logs::LogGroup", {
      RetentionInDays: 30,
    });
  });

  test("SPA client has no secret and Entra OIDC provider exists", () => {
    const template = synth();
    template.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: false,
      AllowedOAuthFlows: ["code"],
      AllowedOAuthFlowsUserPoolClient: true,
      SupportedIdentityProviders: ["MicrosoftEntraID"],
    });
    template.hasResourceProperties("AWS::Cognito::UserPoolIdentityProvider", {
      ProviderName: "MicrosoftEntraID",
      ProviderType: "OIDC",
    });
  });

  test("Lambda IAM is not wildcarded on all resources and actions", () => {
    const template = synth();
    const policies = template.findResources("AWS::IAM::Policy");
    const roles = template.findResources("AWS::IAM::Role");
    const blob = JSON.stringify({ policies, roles });
    expect(blob).not.toMatch(/"Action":"\*"[\s\S]*"Resource":"\*"/);
  });

  test("alarms cover Lambda errors, throttles, and API 5xx and notify the alarm topic", () => {
    const template = synth();
    template.resourceCountIs("AWS::SNS::Topic", 1);
    template.resourceCountIs("AWS::CloudWatch::Alarm", 3);
    for (const [namespace, metricName] of [
      ["AWS/Lambda", "Errors"],
      ["AWS/Lambda", "Throttles"],
      ["AWS/ApiGateway", "5xx"],
    ]) {
      template.hasResourceProperties("AWS::CloudWatch::Alarm", {
        Namespace: namespace,
        MetricName: metricName,
        AlarmActions: [Match.anyValue()],
      });
    }
  });

  test("does not output the Entra client secret", () => {
    const template = synth();
    const outputs = template.findOutputs("*");
    expect(JSON.stringify(outputs)).not.toContain("PLACEHOLDER-000000");
    expect(Object.keys(outputs)).toEqual(
      expect.arrayContaining([
        "ApiUrl",
        "UserPoolId",
        "UserPoolClientId",
        "CognitoDomain",
        "AwsRegion",
        "EntraCallbackUrl",
        "AlarmTopicArn",
      ]),
    );
  });
});

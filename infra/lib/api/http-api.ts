import * as cdk from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { type Construct } from "constructs";

import { dotnetRuntime, resolveApiCode } from "./lambda-code";
import type { AuthResources } from "../auth/cognito";
import type { AppConfig } from "../config/types";
import { removalPolicyFor } from "../config/types";
import { apiThrottle, assertSecureConfig } from "../security/guardrails";

export interface ApiResources {
  httpApi: apigwv2.HttpApi;
  apiFunction: lambda.Function;
}

export function createApi(scope: Construct, config: AppConfig, auth: AuthResources): ApiResources {
  assertSecureConfig(config);

  const removalPolicy = removalPolicyFor(config);

  const apiFunction = new lambda.Function(scope, "ApiFunction", {
    runtime: dotnetRuntime,
    handler: "Web",
    code: resolveApiCode(config.lambdaCode),
    memorySize: 512,
    timeout: cdk.Duration.seconds(30),
    architecture: lambda.Architecture.ARM_64,
    environment: {
      // Every deployed stage runs the hardened Production profile; "Development" is for local Kestrel only.
      ASPNETCORE_ENVIRONMENT: "Production",
      DEPLOYMENT_ENVIRONMENT: config.environmentName,
      Cognito__Region: cdk.Stack.of(scope).region,
      Cognito__UserPoolId: auth.userPool.userPoolId,
      Cognito__ClientId: auth.userPoolClient.userPoolClientId,
      Cors__AllowedOrigins__0: config.frontendUrl,
    },
    logGroup: new logs.LogGroup(scope, "ApiLogGroup", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy,
    }),
  });

  const authorizer = new HttpJwtAuthorizer("CognitoJwt", auth.issuerUrl, {
    jwtAudience: [auth.userPoolClient.userPoolClientId],
    identitySource: ["$request.header.Authorization"],
  });

  const integration = new HttpLambdaIntegration("ApiIntegration", apiFunction);

  const httpApi = new apigwv2.HttpApi(scope, "HttpApi", {
    apiName: `runbook-api-${config.environmentName}`,
    corsPreflight: {
      allowOrigins: [config.frontendUrl],
      allowHeaders: ["Authorization", "Content-Type", "X-Correlation-ID"],
      allowMethods: [
        apigwv2.CorsHttpMethod.GET,
        apigwv2.CorsHttpMethod.POST,
        apigwv2.CorsHttpMethod.PUT,
        apigwv2.CorsHttpMethod.DELETE,
        apigwv2.CorsHttpMethod.OPTIONS,
      ],
    },
    disableExecuteApiEndpoint: false,
  });

  const accessLogGroup = new logs.LogGroup(scope, "HttpApiAccessLogs", {
    retention: logs.RetentionDays.ONE_MONTH,
    removalPolicy,
  });

  const defaultStage = httpApi.defaultStage?.node.defaultChild as apigwv2.CfnStage | undefined;
  if (defaultStage) {
    defaultStage.accessLogSettings = {
      destinationArn: accessLogGroup.logGroupArn,
      format: JSON.stringify({
        requestId: "$context.requestId",
        ip: "$context.identity.sourceIp",
        requestTime: "$context.requestTime",
        httpMethod: "$context.httpMethod",
        path: "$context.path",
        routeKey: "$context.routeKey",
        status: "$context.status",
        protocol: "$context.protocol",
        responseLength: "$context.responseLength",
        integrationLatency: "$context.integrationLatency",
        authorizerError: "$context.authorizer.error",
      }),
    };
    defaultStage.defaultRouteSettings = {
      throttlingBurstLimit: apiThrottle.burstLimit,
      throttlingRateLimit: apiThrottle.rateLimit,
    };
  }

  httpApi.addRoutes({
    path: "/health",
    methods: [apigwv2.HttpMethod.GET],
    integration,
  });

  httpApi.addRoutes({
    path: "/v1/me",
    methods: [apigwv2.HttpMethod.GET],
    integration,
    authorizer,
  });

  httpApi.addRoutes({
    path: "/v1/runbooks",
    methods: [apigwv2.HttpMethod.GET],
    integration,
    authorizer,
    authorizationScopes: ["runbook-api/read"],
  });

  httpApi.addRoutes({
    path: "/v1/runbooks/{id}",
    methods: [apigwv2.HttpMethod.GET],
    integration,
    authorizer,
    authorizationScopes: ["runbook-api/read"],
  });

  httpApi.addRoutes({
    path: "/v1/runbooks",
    methods: [apigwv2.HttpMethod.POST],
    integration,
    authorizer,
    authorizationScopes: ["runbook-api/write"],
  });

  httpApi.addRoutes({
    path: "/v1/runbooks/{id}",
    methods: [apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE],
    integration,
    authorizer,
    authorizationScopes: ["runbook-api/write"],
  });

  httpApi.addRoutes({
    path: "/v1/admin/{proxy+}",
    methods: [apigwv2.HttpMethod.GET],
    integration,
    authorizer,
    authorizationScopes: ["runbook-api/admin"],
  });

  return { httpApi, apiFunction };
}

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { type Construct } from "constructs";

import type { AppConfig } from "../config/types";
import { removalPolicyFor } from "../config/types";

export interface AuthResources {
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  domain: cognito.UserPoolDomain;
  /** Hosted UI host, e.g. `<prefix>.auth.<region>.amazoncognito.com` (no scheme). */
  hostedUiDomain: string;
  /** Where Entra must redirect after authenticating: `https://<hostedUiDomain>/oauth2/idpresponse`. */
  entraCallbackUrl: string;
  issuerUrl: string;
}

export function createAuth(scope: Construct, config: AppConfig): AuthResources {
  const userPool = new cognito.UserPool(scope, "UserPool", {
    selfSignUpEnabled: false,
    signInAliases: { email: true },
    standardAttributes: {
      email: { required: true, mutable: true },
      givenName: { required: false, mutable: true },
      familyName: { required: false, mutable: true },
      fullname: { required: false, mutable: true },
      preferredUsername: { required: false, mutable: true },
    },
    removalPolicy: removalPolicyFor(config),
    accountRecovery: cognito.AccountRecovery.NONE,
  });

  const secret = secretsmanager.Secret.fromSecretCompleteArn(
    scope,
    "EntraClientSecret",
    config.entraClientSecretSecretArn,
  );

  const identityProvider = new cognito.UserPoolIdentityProviderOidc(scope, "MicrosoftEntraID", {
    userPool,
    name: "MicrosoftEntraID",
    clientId: config.entraClientId,
    clientSecret: secret.secretValue.unsafeUnwrap(),
    issuerUrl: `https://login.microsoftonline.com/${config.entraTenantId}/v2.0`,
    scopes: ["openid", "profile", "email"],
    attributeRequestMethod: cognito.OidcAttributeRequestMethod.GET,
    attributeMapping: {
      email: cognito.ProviderAttribute.other("email"),
      givenName: cognito.ProviderAttribute.other("given_name"),
      familyName: cognito.ProviderAttribute.other("family_name"),
      fullname: cognito.ProviderAttribute.other("name"),
      preferredUsername: cognito.ProviderAttribute.other("preferred_username"),
    },
  });

  const readScope = new cognito.ResourceServerScope({
    scopeName: "read",
    scopeDescription: "Read runbooks",
  });
  const writeScope = new cognito.ResourceServerScope({
    scopeName: "write",
    scopeDescription: "Write runbooks",
  });
  const adminScope = new cognito.ResourceServerScope({
    scopeName: "admin",
    scopeDescription: "Administer runbooks",
  });

  const resourceServer = userPool.addResourceServer("RunbookApi", {
    identifier: "runbook-api",
    userPoolResourceServerName: "runbook-api",
    scopes: [readScope, writeScope, adminScope],
  });

  const userPoolClient = new cognito.UserPoolClient(scope, "SpaClient", {
    userPool,
    generateSecret: false,
    preventUserExistenceErrors: true,
    authFlows: {
      userSrp: false,
      userPassword: false,
      adminUserPassword: false,
      custom: false,
    },
    oAuth: {
      flows: {
        authorizationCodeGrant: true,
        implicitCodeGrant: false,
        clientCredentials: false,
      },
      callbackUrls: [config.frontendCallbackUrl],
      logoutUrls: [config.frontendLogoutUrl],
      scopes: [
        cognito.OAuthScope.OPENID,
        cognito.OAuthScope.EMAIL,
        cognito.OAuthScope.PROFILE,
        cognito.OAuthScope.resourceServer(resourceServer, readScope),
        cognito.OAuthScope.resourceServer(resourceServer, writeScope),
        cognito.OAuthScope.resourceServer(resourceServer, adminScope),
      ],
    },
    supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.custom("MicrosoftEntraID")],
    accessTokenValidity: cdk.Duration.minutes(60),
    idTokenValidity: cdk.Duration.minutes(60),
    refreshTokenValidity: cdk.Duration.days(30),
  });
  userPoolClient.node.addDependency(identityProvider);
  userPoolClient.node.addDependency(resourceServer);

  const domain = userPool.addDomain("Domain", {
    cognitoDomain: { domainPrefix: config.cognitoDomainPrefix },
  });

  const region = cdk.Stack.of(scope).region;
  const hostedUiDomain = `${domain.domainName}.auth.${region}.amazoncognito.com`;
  const entraCallbackUrl = `https://${hostedUiDomain}/oauth2/idpresponse`;
  const issuerUrl = `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`;

  return { userPool, userPoolClient, domain, hostedUiDomain, entraCallbackUrl, issuerUrl };
}

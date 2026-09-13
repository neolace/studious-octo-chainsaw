import { Amplify } from "aws-amplify";

import { env } from "./env";

export const OIDC_PROVIDER_NAME = "MicrosoftEntraID";

export const oauthScopes = [
  "openid",
  "profile",
  "email",
  "runbook-api/read",
  "runbook-api/write",
  "runbook-api/admin",
] as const;

export function configureAuth(): void {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: env.cognitoUserPoolId,
        userPoolClientId: env.cognitoClientId,
        loginWith: {
          oauth: {
            domain: env.cognitoDomain,
            scopes: [...oauthScopes],
            redirectSignIn: [env.redirectSignIn],
            redirectSignOut: [env.redirectSignOut],
            responseType: "code",
          },
        },
      },
    },
  });
}

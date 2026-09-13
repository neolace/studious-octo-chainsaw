# Microsoft Entra setup

Do not hard-code tenant IDs, client IDs, or secrets.

1. Create an app registration in a Microsoft Entra tenant. Record Tenant ID and Application (client) ID.
2. Create a client secret. Store it in AWS Secrets Manager. Put the secret ARN in `ENTRA_CLIENT_SECRET_SECRET_ARN`.
3. Never place the secret in `.env`, `VITE_*`, Git, CDK source, or stack outputs.
4. Redirect URI in Entra must be the **Cognito** callback: `https://<cognito-domain>/oauth2/idpresponse`.
5. OIDC issuer: `https://login.microsoftonline.com/{ENTRA_TENANT_ID}/v2.0`.
6. Scopes: `openid profile email`. Do not add Microsoft Graph permissions unless a feature needs them.

After Cognito is deployed, copy the `EntraCallbackUrl` stack output into the Entra redirect URI list. That is a two-phase step: Cognito domain first, then Entra redirect, then OIDC provider is already wired by CDK to that issuer.

The React callback (`/auth/callback`) is configured on the Cognito app client, not on the Entra app.

# Agent notes

Spec: `docs/entra-log-sso-api-layer.md`. Do not invent a different stack or auth model.

## Architecture (do not invert)

Cognito is the **application identity boundary**. Entra authenticates users via OIDC federation. React and the .NET API consume **Cognito access tokens**, never Entra tokens.

```
React (Amplify v6) → Cognito (OIDC) → Entra
React → API Gateway HTTP API (JWT authorizer + OAuth scopes) → .NET 10 Lambda (dotnet10)
```

Two different callbacks — do not mix them:

- Entra → Cognito: `https://<cognito-domain>/oauth2/idpresponse`
- Cognito → React: `/auth/callback` (local: `http://localhost:5173/auth/callback`)

OIDC provider name must be `MicrosoftEntraID` (Amplify `signInWithRedirect` uses this). Cognito SPA client has **no secret**; authorization code + PKCE only.

Resource server identifier: `runbook-api`. Scopes: `runbook-api/read`, `runbook-api/write`, `runbook-api/admin`. Send the **access token**, not the ID token.

API Gateway is the JWT validation boundary. .NET must use the API Gateway-authenticated principal (`HttpContext.User` via `Amazon.Lambda.AspNetCoreServer`), not client headers like `X-User` / `X-Email`. Still apply app-level scope policies (defense in depth).

## Intended layout

```
apps/web/     React + Vite + TypeScript (strict, noUncheckedIndexedAccess)
apps/api/     .NET 10 ASP.NET Core Minimal APIs (local Kestrel + Lambda HttpApi)
infra/        AWS CDK v2 TypeScript
docs/         all docs except README.md and AGENTS.md
```

Do not put secrets in `VITE_*`, `.env`, Git, CDK source, or stack outputs. Frontend may only have pool/client/domain/API URL/redirects. Entra client secret lives in Secrets Manager (`ENTRA_CLIENT_SECRET_SECRET_ARN`). Never invent tenant IDs, ARNs, account IDs, or credentials — use placeholders.

No production CORS `*`. No Microsoft Graph permissions unless a feature actually needs them. Do not log Authorization headers, JWTs, or secrets.

## Commands

```bash
npm run install:all
npm run dev          # Vite :5173
npm run dev:api      # Kestrel :5080
npm test             # web + API unit + API integration + CDK tests
npm run test:e2e     # Playwright (login page only; no MFA automation). Local: Edge. CI: Chromium via npx playwright install
npm run lint && npm run typecheck && npm run format:check
dotnet publish apps/api/src/Web/Web.csproj -c Release -r linux-arm64 --self-contained false -o apps/api/src/Web/bin/lambda
CDK_LAMBDA_STUB=1 npm run cdk:synth   # template-only
```

Namespaces are `RunbookApi.*` (not `Runbook.Api.*` — that clashes with the `Runbook` entity). Local API: Kestrel. AWS: `AddAWSLambdaHosting(LambdaEventSource.HttpApi)`. Health `GET /health` may be unauthenticated; everything else is not.

Do not claim SSO or AWS deploy works unless it ran against real Entra/AWS. Pin versions.

# Security

- Authorization code + PKCE. No implicit flow. No SPA client secret.
- Cognito access tokens authorize the API. API Gateway JWT authorizer is the validation boundary.
- .NET still applies scope policies (`RequireReadScope`, `RequireWriteScope`, `RequireAdminScope`).
- Identity comes from validated claims (`HttpContext.User`), never `X-User` / `X-Email` headers.
- No production CORS `*`.
- No secrets in Git, `VITE_*`, CDK source, or stack outputs.
- Do not log `Authorization` headers, JWTs, refresh tokens, or secrets.
- HTTPS only outside localhost. `infra/lib/security/guardrails.ts` fails synth on `http://` frontend URLs outside localhost, on any localhost or `*` origin in `prod`, and the API refuses to start with a `*` CORS origin.
- Lambda IAM starts with no data-plane `*` permissions.
- Every deployed Lambda runs `ASPNETCORE_ENVIRONMENT=Production`; the OpenAPI document is mapped only under local `Development` and still requires a bearer token.
- Dependencies are audited in CI (`npm audit --audit-level=high`, `dotnet package list --vulnerable`) and committed secrets are rejected by a scan.
- Request logs carry method, path, route, status, duration, subject and correlation ID — never headers, tokens or bodies.

```mermaid
%%{init: {
  "theme": "base",
  "securityLevel": "strict",
  "themeVariables": {
    "background": "#0d1117",
    "mainBkg": "#161b22",
    "secondBkg": "#1c2128",
    "primaryColor": "#161b22",
    "primaryTextColor": "#f0f6fc",
    "primaryBorderColor": "#58a6ff",
    "secondaryColor": "#21262d",
    "secondaryTextColor": "#f0f6fc",
    "secondaryBorderColor": "#3fb950",
    "tertiaryColor": "#21262d",
    "tertiaryTextColor": "#f0f6fc",
    "tertiaryBorderColor": "#d29922",
    "lineColor": "#58a6ff",
    "textColor": "#f0f6fc",
    "clusterBkg": "#161b22",
    "clusterBorder": "#30363d",
    "edgeLabelBackground": "#0d1117",
    "fontFamily": "Inter, Arial, Helvetica, sans-serif"
  }
}}%%
flowchart TD
    Token["Cognito access token"] --> GW["API Gateway JWT authorizer"]
    GW -->|"invalid / expired"| U401["401"]
    GW -->|"valid, missing scope"| U403["403"]
    GW -->|"valid + scope"| Lambda["Lambda / .NET policies"]
    Lambda -->|"missing subject or scope"| U403
    Lambda -->|"ok"| App["Handler"]
```

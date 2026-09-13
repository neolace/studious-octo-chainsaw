# Architecture

Cognito is the application identity boundary. Microsoft Entra authenticates users; Cognito issues the tokens the SPA and API consume.

## System architecture

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
flowchart LR
    User["Enterprise User"]
    subgraph Browser["Browser"]
        React["React + TypeScript"]
        Amplify["AWS Amplify Auth"]
        ApiClient["Typed API Client"]
    end
    subgraph Identity["Identity"]
        Cognito["Amazon Cognito"]
        Entra["Microsoft Entra ID"]
    end
    subgraph AwsApi["AWS API Layer"]
        Gateway["API Gateway HTTP API"]
        Jwt["JWT Authorizer"]
        Lambda["AWS Lambda"]
        DotNet[".NET 10 API"]
    end
    User --> React
    React --> Amplify
    Amplify --> Cognito
    Cognito -->|"OIDC"| Entra
    Entra -->|"Authorization Code"| Cognito
    Cognito -->|"Cognito JWT"| Amplify
    Amplify --> ApiClient
    ApiClient -->|"Bearer Access Token"| Gateway
    Gateway --> Jwt
    Jwt -->|"Valid JWT + Scope"| Lambda
    Lambda --> DotNet
```

## Repository structure

- `apps/web` — React + Vite SPA (Amplify v6, PKCE)
- `apps/api` — .NET 10 Minimal APIs (Kestrel locally, Lambda `dotnet10` in AWS)
- `infra` — AWS CDK v2 (`auth/` Cognito, `api/` HTTP API + Lambda, `security/` synth-time guardrails, `monitoring/` alarms, `config/` typed environment)
- `docs` — operational documentation

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
flowchart LR
    subgraph Web["apps/web"]
        Auth["auth/ (AuthProvider, ProtectedRoute)"]
        Client["api/ (client, ApiProvider)"]
        Pages["pages/"]
    end
    subgraph Api["apps/api"]
        WebProj["Web (endpoints, auth, policies, middleware)"]
        App["Application (ICurrentUser, IRunbookStore, scopes)"]
        Domain["Domain (Runbook)"]
        InfraProj["Infrastructure (InMemoryRunbookStore)"]
    end
    subgraph Infra["infra"]
        Cfg["config/"]
        Sec["security/"]
        Cog["auth/"]
        Http["api/"]
        Mon["monitoring/"]
    end
    Pages --> Auth
    Pages --> Client
    Client -->|"Bearer access token"| WebProj
    WebProj --> App
    App --> Domain
    InfraProj --> App
    Cfg --> Sec
    Sec --> Http
    Cog --> Http
    Http --> Mon
    Cog -.->|"provisions"| Auth
    Http -.->|"provisions"| WebProj
```

## Request lifecycle

API Gateway validates Cognito access tokens and required OAuth scopes. Lambda receives an already-authenticated principal via `Amazon.Lambda.AspNetCoreServer`. The API still enforces scope policies, assigns a correlation ID, and logs one structured entry per request (method, path, route, status, duration, subject, correlation ID — never headers or tokens).

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
sequenceDiagram
    participant Query as React Query
    participant Client as apiFetch
    participant Amplify as Amplify Auth
    participant APIGW as API Gateway
    participant Lambda as Lambda host
    participant Log as RequestLoggingMiddleware
    participant AuthN as LambdaAuthorizerHandler
    participant AuthZ as Scope policy
    participant Endpoint as Minimal API endpoint

    Query->>Client: queryFn
    Client->>Amplify: fetchAuthSession()
    Amplify-->>Client: access token (refreshed if needed)
    alt no access token
        Client-->>Query: ApiError 401 missing_access_token
        Query->>Query: onSessionExpired → sign out → /login
    end
    Client->>APIGW: GET /v1/runbooks<br/>Authorization: Bearer, X-Correlation-ID
    APIGW->>APIGW: JWT authorizer: signature, issuer, audience, expiry, scope
    alt token invalid
        APIGW-->>Client: 401
    else scope missing
        APIGW-->>Client: 403
    end
    APIGW->>Lambda: HTTP API v2 event + JWT claims
    Lambda->>Log: HttpContext (User from event claims)
    Log->>Log: read or assign X-Correlation-ID
    Log->>AuthN: next()
    AuthN->>AuthZ: principal from validated claims
    AuthZ->>AuthZ: RequireReadScope: subject + runbook-api/read
    alt missing subject or scope
        AuthZ-->>Log: 403 Problem Details (traceId)
    else authorized
        AuthZ->>Endpoint: ICurrentUser
        Endpoint-->>Log: 200 JSON
    end
    Log->>Log: log method, path, route, status, ms, subject, correlationId
    Log-->>APIGW: response + X-Correlation-ID
    APIGW-->>Client: response
    Client-->>Query: data or ApiError
```

## CI/CD pipeline

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
flowchart LR
    PR["Pull request / push"] --> CI["GitHub Actions ci.yml"]
    CI --> Sec["security: secret scan,<br/>npm audit (high+), NuGet audit"]
    CI --> Web["web: typecheck, lint,<br/>format, test, build"]
    CI --> E2E["e2e: Playwright (Chromium)"]
    CI --> Api["api: build, test,<br/>dotnet format --verify"]
    CI --> Infra["infra: typecheck, lint,<br/>format, test, synth (stub Lambda)"]
    Dispatch["workflow_dispatch<br/>(dev | test | prod)"] --> Deploy["deploy.yml: GitHub OIDC → AWS role<br/>dotnet publish → cdk diff → cdk deploy"]
    PR -.->|"never deploys"| Deploy
```

CI (`.github/workflows/ci.yml`) typechecks, lints, format-checks, tests, audits dependencies, and synths. It does not deploy from pull requests. Deploy is `workflow_dispatch` with GitHub OIDC and a fixed choice of environment.

See [authentication.md](authentication.md), [deployment.md](deployment.md), and [security.md](security.md).

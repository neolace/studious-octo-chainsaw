# studious-octo-chainsaw

Enterprise SSO foundation: React SPA → Amazon Cognito (OIDC to Microsoft Entra) → API Gateway HTTP API → .NET 10 Lambda.

Cognito is the application identity boundary. The browser never receives an Entra client secret. API calls use Cognito **access tokens**.

## Architecture

See [docs/architecture.md](docs/architecture.md), [docs/authentication.md](docs/authentication.md), and [docs/entra-log-sso-api-layer.md](docs/entra-log-sso-api-layer.md).

```
React (Amplify v6) → Cognito (OIDC) → Entra
React → API Gateway HTTP API (JWT authorizer + OAuth scopes) → .NET 10 Lambda
```

## Repository

| Path | Role |
| --- | --- |
| `apps/web` | React + Vite + TypeScript |
| `apps/api` | .NET 10 Minimal APIs |
| `infra` | AWS CDK v2 |
| `docs` | Architecture, Entra setup, deploy, security |

## Prerequisites

- Node 24 (pinned in `.nvmrc`; `nvm use` picks it up)
- .NET 10 SDK
- AWS credentials / CDK bootstrap for deploy
- A Microsoft Entra tenant (see [docs/entra-setup.md](docs/entra-setup.md))

## Local development

```bash
cp .env.example .env
npm run install:all
npm run dev:api
npm run dev
```

Details: [docs/local-development.md](docs/local-development.md).

Frontend `VITE_*` values are non-secret (pool, client, domain, API URL, redirects). Copy them from CDK outputs after deploy.

## Tests, lint, format

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:e2e
npm run lint
npm run typecheck
npm run format
npm run format:check
```

Playwright does not automate Microsoft MFA. Full SSO E2E needs a dedicated test tenant.

## CDK

```bash
dotnet publish apps/api/src/Web/Web.csproj -c Release -r linux-arm64 --self-contained false -o apps/api/src/Web/bin/lambda
npm run cdk:synth
npm run cdk:diff
npm run cdk:deploy
```

Template-only synth without a published binary: `CDK_LAMBDA_STUB=1`. `ENVIRONMENT_NAME` must be one of `local`, `dev`, `test`, `prod`; synth fails on anything else, on `http://` frontend URLs outside localhost, and on localhost or `*` origins in `prod`.

Deployment order and OIDC: [docs/deployment.md](docs/deployment.md).

## Security notes

- No production CORS `*`
- No secrets in Git, `VITE_*`, CDK source, or stack outputs
- Do not log Authorization headers or JWTs
- [docs/security.md](docs/security.md) · [docs/troubleshooting.md](docs/troubleshooting.md)

Frontend contains no Entra secret. API authorization uses Cognito access tokens. API Gateway performs JWT validation. .NET 10 performs application-level authorization. The Entra tenant ID is configurable and not hard-coded.

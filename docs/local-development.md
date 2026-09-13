# Local development

Prerequisites: Node 24 (pinned in `.nvmrc`), .NET 10 SDK, AWS CDK CLI (for synth/deploy).

```bash
cp .env.example .env
npm run install:all
```

Frontend env values are non-secret Cognito/API wiring only. Copy CDK outputs into `apps/web/.env` after a deploy. Placeholders are required until then; `loadEnv()` fails fast if they are missing.

```bash
npm run dev:api
npm run dev
```

- API: Kestrel at `http://localhost:5080`
- SPA: Vite at `http://localhost:5173`
- Login: `http://localhost:5173/login` → Cognito → Entra
- Callback: `http://localhost:5173/auth/callback`

Protected API routes need a real Cognito access token locally. `GET /health` is unauthenticated.

Playwright covers the unauthenticated login page only. Do not automate Microsoft MFA. See [e2e-authentication.md](e2e-authentication.md).

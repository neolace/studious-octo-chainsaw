# Code review — 2026-09-13

Two-axis review of the working tree against `4d5d3ad` (Initial commit): the modified `README.md` plus 115 new files. **Standards** checks the code against [AGENTS.md](../AGENTS.md) and a fixed Fowler smell baseline; **Spec** checks it against [entra-log-sso-api-layer.md](entra-log-sso-api-layer.md). The two axes are kept separate on purpose: a change can follow every convention and still implement the wrong thing, or the reverse.

Every finding below has been resolved unless marked **Deferred**.

## Verification after fixes

| Check                                                     | Result                                                 |
| --------------------------------------------------------- | ------------------------------------------------------ |
| `npm run lint` / `typecheck` / `format:check`             | clean (web, infra, `dotnet format --verify-no-changes`) |
| `npm test`                                                | web 19/19 · .NET 33/33 · infra 28/28                   |
| `npm run build --workspace apps/web`                      | OK                                                     |
| `CDK_LAMBDA_STUB=1 npm run cdk:synth` (CI environment)    | OK — 3 alarms + SNS topic in template                  |
| `npm audit --audit-level=high`, NuGet `--vulnerable`      | clean                                                  |
| Playwright e2e                                            | **not run locally** (needs a browser install; CI runs it) |

---

## Standards

### Documented-standard violations

| # | Severity  | Finding                                                                                                                                                    | Resolution                                                                                                                                                           |
| - | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | Hard      | `.gitignore` `bin/` swallowed `infra/bin/app.ts`, the CDK entry point; a clean clone or CI could not synth.                                                | Kept `bin/` (it hides .NET output) and added `!infra/bin/`. Verified with `git check-ignore`.                                                                       |
| 2 | Judgement | Invented-looking ARN `…:secret:entra-client-secret-abcdef` in `infra/test/test-config.ts` and `ci.yml`. AGENTS.md: never invent ARNs.                     | `…:secret:PLACEHOLDER-000000` with a comment explaining `fromSecretCompleteArn` needs a well-formed value.                                                           |
| 3 | Judgement | `VITE_AWS_REGION` declared but `env.awsRegion` never read. AGENTS.md limits frontend config to pool/client/domain/API URL/redirects.                        | Removed from `env.ts`, `vite-env.d.ts`, `vite.config.ts` and both `.env.example` files. (Spec L496 lists it as *permitted*, not required.)                            |
| 4 | Judgement | `MapOpenApi().AllowAnonymous()` — AGENTS.md: only `/health` may be unauthenticated.                                                                        | `.AllowAnonymous()` removed; the document falls under the fallback policy and is only mapped under local `Development`.                                             |
| 5 | Judgement | "Pin versions": `npm install` in workflows (lockfile can drift); `dotnet-version: "10.0.x"` floats while `global.json` pins 10.0.401.                     | `npm ci` everywhere; `setup-dotnet` uses `global-json-file: apps/api/global.json`.                                                                                  |

### Smells (judgement calls)

| Smell                  | Where                                                                                                        | Resolution                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Duplicated Code        | `CurrentUser.cs` and `AuthorizationPolicies.cs` both parsed `scope`/`scp` and `sub` from the same claim set. | [ClaimsPrincipalExtensions.cs](../apps/api/src/Web/Authentication/ClaimsPrincipalExtensions.cs) — `GetSubject`, `HasSubject`, `GetScopes`, `HasScope`… used by both. |
| Duplicated Code        | Three scope policies identical except the scope string.                                                      | Private `AddScopePolicy(name, scope)`. `AuthorizationPolicyTests` now evaluate the registered policies through `IAuthorizationService`.                     |
| Duplicated Code        | `TestAuthHandler.cs` built the same ticket in both branches; the "without subject" branch was dead.          | Branch removed; policies are what reject a subject-less principal.                                                                                          |
| Repeated Switches      | `environmentName === "prod" ? RETAIN : DESTROY` five times across `cognito.ts` / `http-api.ts`.              | `isProduction(config)` and `removalPolicyFor(config)` in `infra/lib/config/types.ts`.                                                                       |
| Duplicated Code        | Lambda-stub path built three ways (`lambda-code.ts`, `types.ts`, `app-stack.test.ts`).                       | `lambdaStubDir` from `lambda-code.ts` is the single source.                                                                                                 |
| Duplicated Code        | `app-stack.ts` rebuilt `${domain}.auth.${region}.amazoncognito.com` twice.                                   | `createAuth` returns `hostedUiDomain` and `entraCallbackUrl`.                                                                                               |
| Duplicated Code        | Topbar + Sign out copied in `HomePage` / `RunbooksPage`; signed-out state literal repeated in `AuthProvider`. | [TopBar.tsx](../apps/web/src/components/TopBar.tsx); `signedOut(error?)` helper.                                                                            |
| Duplicated Code        | `vi.mock("aws-amplify/auth", …)` copied into five test files.                                                | Hoisted into `tests/setup.ts` with per-test defaults (`beforeEach`).                                                                                        |
| Speculative Generality | Unused: `ApiScopes.ResourceServer`, `ICurrentUser.Groups/IsAuthenticated/HasScope`, `errors.ts isApiError`. | Removed. (`useRunbook` is spec-endorsed and kept.)                                                                                                          |
| Primitive Obsession    | `ApiError.code: string` fed by a `switch`; `as EnvironmentName` unchecked cast.                              | `ApiErrorCode` union + lookup map; `parseEnvironmentName` validates against `environmentNames`.                                                             |
| Mysterious Name        | `https://example.com/problems/...` shipped as the RFC 7807 `type`.                                           | `type` left unset so ASP.NET emits the RFC 9110 section URI, matching every other Problem Details response. Asserted in an integration test.               |

---

## Spec

### Missing / partial

| Spec reference                                            | Finding                                                                                                                 | Resolution                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L841–842, L1161, L1541                                    | `infra/bin/app.ts` gitignored (see Standards #1).                                                                        | `!infra/bin/`.                                                                                                                                                                                                                                                |
| L1301–1328, L1424, L1435–1436                             | "Request lifecycle" diagram was a repo graph; no infrastructure diagram; diagrams used a subset of the shared theme.      | Full shared theme on every diagram. [architecture.md](architecture.md): real request-lifecycle sequence, component graph, updated CI diagram. [deployment.md](deployment.md): infrastructure/deployment diagram.                                              |
| L1229–1239                                                | Correlation ID added to `ResponseHeaders` but never logged (`LoggingFields` omitted it); subject never logged.           | [RequestLoggingMiddleware.cs](../apps/api/src/Web/Middleware/RequestLoggingMiddleware.cs) replaces `CorrelationIdMiddleware` + `HttpLogging`: one structured line per request with correlation ID, method, path, route, status, duration and subject.          |
| L546 (expired session), L549 (unauthenticated navigation) | A 401 / `missing_access_token` surfaced as "Could not load your profile" with no re-login; `state.from` never consumed. | `AuthProvider` verifies `fetchAuthSession()` on load; [query-client.ts](../apps/web/src/api/query-client.ts) routes any API 401 to `expireSession()` → `/login` with an explanation (403 stays in place). [return-to.ts](../apps/web/src/auth/return-to.ts) round-trips a validated same-origin path through the OAuth redirect. |
| L1096, L1184, L1546                                       | CI never ran infra `format:check`; "security checks" was a single regex grep.                                           | Added infra `format:check`, `npm audit --audit-level=high`, and a NuGet `--vulnerable` audit that fails on findings.                                                                                                                                         |
| L1092                                                     | No import-hygiene lint.                                                                                                  | `eslint-plugin-import-x@4.16.1` in web and infra (`order`, `no-duplicates`, `first`, `newline-after-import`, `no-useless-path-segments`) plus `consistent-type-imports`.                                                                                     |
| L845–846                                                  | `infra/lib/security/` and `infra/lib/monitoring/` absent.                                                                | [guardrails.ts](../infra/lib/security/guardrails.ts): prod-CORS guard moved here, plus HTTPS-outside-localhost and no-localhost-in-prod checks. [alarms.ts](../infra/lib/monitoring/alarms.ts): Lambda errors/throttles and API 5xx → SNS `AlarmTopic` (`AlarmTopicArn` output). |
| L884                                                      | `ENVIRONMENT_NAME` cast unchecked and defaulted to `dev`.                                                                | Required and validated; synth fails on anything outside `local | dev | test | prod`. Covered by `infra/test/config.test.ts`.                                                                                                                                  |

### Scope creep

None significant. The `EntraCallbackUrl` output and local in-process JWT validation were judged defensible and kept.

### Implemented but wrong

| Spec reference | Finding                                                                                                                                                 | Resolution                                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| L1475, L1189   | `deploy.yml` ran `cdk diff` with no env; the config block was attached only to the `cdk deploy` step, so `loadConfigFromEnv()` threw and the job always failed at diff. | Config env moved to job level; the `environment` input is now a `choice` of `dev` / `test` / `prod`.                                          |
| L1204          | Lambda dev/test stages ran `ASPNETCORE_ENVIRONMENT=Development`, enabling the anonymous OpenAPI route in deployed environments.                          | Every deployed stage runs `Production` (`DEPLOYMENT_ENVIRONMENT` carries the stage name). Asserted in `app-stack.test.ts`.                     |

---

## Changes made while fixing (not findings)

- **`constructs` 10.4.2 → 10.8.1** — `aws-cdk-lib@2.269.0` peer-requires `^10.5.0`; two copies were installed and `npm run typecheck --workspace infra` already failed on the type clash.
- **Dependency bumps to clear existing high/critical advisories** so the new audit gate is meaningful, all within the same major: `react-router-dom` 7.18.3, `vite` 7.3.6, `vitest` 3.2.7, `@playwright/test` 1.63.0. The react-router advisories included open-redirect-via-`//`/backslash issues that touch the new return-to handling.
- `.env.example` documents `ENVIRONMENT_NAME` and the HTTPS rule; [troubleshooting.md](troubleshooting.md), [security.md](security.md) and [authentication.md](authentication.md) describe the new synth guardrails, session lifecycle and logging.

## Deferred

- `@vitest/mocker` moderate advisory — the fix requires vitest 5 (a major); the CI gate is set at `high`.
- Playwright e2e was not run locally after the `@playwright/test` bump; CI installs Chromium and runs it.

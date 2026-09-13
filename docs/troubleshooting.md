# Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Redirect loops on `/login` | Mixing Entra→Cognito and Cognito→React callback URLs |
| `AADSTS50011` | Entra redirect URI is not `https://<cognito-domain>/oauth2/idpresponse` |
| Amplify `invalid_provider` | OIDC provider name is not `MicrosoftEntraID` |
| API 401 | ID token sent instead of access token, or JWT issuer/audience mismatch |
| API 403 | Missing `runbook-api/read`, `/write`, or `/admin` on the access token |
| SPA fail-fast on boot | Missing `VITE_*` values |
| CDK synth wants Docker | Publish the API to `apps/api/src/Web/bin/lambda` or set `CDK_LAMBDA_STUB=1` for template-only synth |
| `ENVIRONMENT_NAME must be one of …` | Only `local`, `dev`, `test`, `prod` are accepted; there is no default |
| `… must use https outside localhost` / `cannot point at localhost` | `FRONTEND_*` URLs must be `https://` when not localhost; `prod` rejects localhost and `*` entirely |
| Sent back to `/login` with "session has expired" | The Cognito refresh token is gone or expired, or the API returned 401; sign in again |
| Landed on `/` instead of the page you asked for | Return path was not a same-origin absolute path, or `sessionStorage` is unavailable |
| Nothing happens when an alarm fires | `AlarmTopicArn` has no subscriptions by default; subscribe on-call to it |

Do not weaken MFA to debug SSO. Use a dedicated test tenant.

# E2E authentication strategy

Playwright covers the unauthenticated login page and protected-route redirect. It does **not** complete Microsoft Entra sign-in and must not disable MFA.

## Mocked local run

```bash
npm run test:e2e
```

The Vite server is started with placeholder `VITE_*` values. Amplify is not expected to finish a real OAuth round-trip.

## Dedicated test tenant

To exercise the full SSO path:

1. Use a non-production Entra tenant with a test user that does not require phishing-resistant MFA automation.
2. Deploy or point local Cognito at that tenant.
3. Run the SPA against real `VITE_COGNITO_*` and `VITE_API_URL` values.
4. Keep Playwright limited to: open login, click Sign in with Microsoft, stop at the Entra hosted page.

Do not store test-user passwords in Git or `VITE_*`.

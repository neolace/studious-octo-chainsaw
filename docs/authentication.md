# Authentication

Two callbacks. Do not mix them.

1. Entra → Cognito: `https://<cognito-domain>/oauth2/idpresponse`
2. Cognito → React: `/auth/callback` (local `http://localhost:5173/auth/callback`)

OIDC provider name is `MicrosoftEntraID`. The SPA client has no secret; authorization code + PKCE only.

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
    actor User
    participant React
    participant Cognito
    participant Entra
    participant APIGW as API Gateway
    participant API as .NET 10 API
    User->>React: Sign in with Microsoft
    React->>Cognito: OAuth authorization request + PKCE
    Cognito->>Entra: Redirect to OIDC provider
    Entra->>User: Authenticate / MFA
    User->>Entra: Complete authentication
    Entra->>Cognito: Authorization code
    Cognito->>Entra: Exchange authorization code
    Entra-->>Cognito: OIDC identity
    Cognito-->>React: Authorization callback
    React->>Cognito: Complete PKCE exchange
    Cognito-->>React: Cognito tokens
    React->>APIGW: Bearer access token
    APIGW->>APIGW: Validate signature, issuer, audience, expiry, scope
    APIGW->>API: Authorized request + JWT claims
    API-->>React: API response
```

## Tokens

Send the Cognito **access token**, never the ID token, as `Authorization: Bearer`. Resource server `runbook-api` with scopes `read`, `write`, and `admin`.

Frontend contains no Entra secret. Amplify stores the Cognito session; do not persist tokens in `localStorage` yourself.

## Session lifecycle in the SPA

- **Initial load / existing session** — `AuthProvider` calls `getCurrentUser()` and then `fetchAuthSession()`. A cached user whose session can no longer mint an access token (refresh token expired or revoked) is signed out with "Your session has expired".
- **Expired session mid-use** — any API `401` (including a missing access token) flows through the shared React Query cache into `expireSession()`: local sign-out, then `/login` with the same message. `403` is a permission problem and is shown in place.
- **Unauthenticated navigation** — `ProtectedRoute` sends the visitor to `/login` remembering the path (`state.from`). `login()` stores it in `sessionStorage` for the OAuth round trip and `/auth/callback` returns there. Only same-origin absolute paths are honoured; `//host`, `/\host`, and external URLs fall back to `/`.
- **Failed redirect** — `signInWithRedirect_failure` or an exception from `signInWithRedirect` lands on `/login` with the error.
- **Logout** — `signOut()` clears the Amplify session and the provider state.

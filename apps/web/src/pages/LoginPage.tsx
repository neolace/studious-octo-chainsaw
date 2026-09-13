import { Navigate, useLocation, useSearchParams } from "react-router-dom";

import { isSafeReturnPath } from "../auth/return-to";
import { useAuth } from "../auth/useAuth";

export function LoginPage() {
  const { isAuthenticated, isLoading, error, login } = useAuth();
  const [params] = useSearchParams();
  const location = useLocation();
  const callbackError = params.get("error");

  // Set by ProtectedRoute when it bounced an unauthenticated visitor here.
  const from: unknown = (location.state as { from?: unknown } | null)?.from;
  const returnTo = isSafeReturnPath(from) ? from : undefined;

  if (isAuthenticated) {
    return <Navigate to={returnTo ?? "/"} replace />;
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            R
          </div>
          <p className="brand-name">Runbook Portal</p>
        </div>
        <h1 id="login-title">Sign in</h1>
        <p className="lede">
          Use your Microsoft work account. Authentication is handled by enterprise SSO through
          Microsoft Entra ID.
        </p>
        {isLoading ? <p role="status">Redirecting to Microsoft…</p> : null}
        {error || callbackError ? (
          <p role="alert" className="error">
            {error?.message ?? "Sign-in did not complete. Try again."}
          </p>
        ) : null}
        <button
          type="button"
          className="primary"
          onClick={() => void login(returnTo)}
          disabled={isLoading}
        >
          Sign in with Microsoft
        </button>
      </section>
    </main>
  );
}

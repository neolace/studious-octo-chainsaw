import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { takeReturnTo } from "../auth/return-to";
import { useAuth } from "../auth/useAuth";

export function AuthCallbackPage() {
  const { isAuthenticated, isLoading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (isAuthenticated) {
      navigate(takeReturnTo(), { replace: true });
      return;
    }
    navigate(error ? "/login?error=callback" : "/login", { replace: true });
  }, [error, isAuthenticated, isLoading, navigate]);

  return (
    <main className="page">
      <p role="status">Completing sign-in…</p>
    </main>
  );
}

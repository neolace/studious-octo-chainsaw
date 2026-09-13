import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";

import { AuthContext } from "./auth-context";
import { type AuthState } from "./auth-types";
import { rememberReturnTo } from "./return-to";
import { OIDC_PROVIDER_NAME } from "../config/auth";

export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again.";

const initialState: AuthState = {
  isLoading: true,
  isAuthenticated: false,
  user: null,
  error: null,
};

function signedOut(error: Error | null = null): AuthState {
  return { isLoading: false, isAuthenticated: false, user: null, error };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState);

  const expireSession = useCallback(async () => {
    try {
      await signOut();
    } catch {
      // Local sign-out is best effort; the session is discarded either way.
    }
    setState(signedOut(new Error(SESSION_EXPIRED_MESSAGE)));
  }, []);

  const refresh = useCallback(async () => {
    let user;
    try {
      user = await getCurrentUser();
    } catch {
      setState(signedOut());
      return;
    }

    // getCurrentUser answers from the cached session. If the refresh token has expired,
    // that session still "has a user" but can no longer mint an access token.
    const session = await fetchAuthSession().catch(() => undefined);
    if (!session?.tokens?.accessToken) {
      await expireSession();
      return;
    }

    setState({ isLoading: false, isAuthenticated: true, user, error: null });
  }, [expireSession]);

  useEffect(() => {
    void refresh();
    const stop = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn" || payload.event === "signedOut") {
        void refresh();
      }
      if (payload.event === "signInWithRedirect_failure") {
        setState(signedOut(new Error("Sign-in redirect failed.")));
      }
    });
    return () => {
      stop();
    };
  }, [refresh]);

  const login = useCallback(async (returnTo?: string) => {
    rememberReturnTo(returnTo);
    setState((current) => ({ ...current, isLoading: true, error: null }));
    try {
      await signInWithRedirect({
        provider: { custom: OIDC_PROVIDER_NAME },
      });
    } catch (error) {
      setState(signedOut(error instanceof Error ? error : new Error("Sign-in failed.")));
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setState(signedOut());
  }, []);

  const value = useMemo(
    () => ({ ...state, login, logout, expireSession }),
    [state, login, logout, expireSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext } from "react";

import { type AuthState } from "./auth-types";

export interface AuthContextValue extends AuthState {
  /** Start the Cognito → Entra redirect; `returnTo` is where to land afterwards. */
  login: (returnTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** End a session that can no longer produce an access token (expired or revoked). */
  expireSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

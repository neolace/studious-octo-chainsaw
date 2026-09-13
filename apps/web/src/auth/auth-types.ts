import type { AuthUser } from "aws-amplify/auth";

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  error: Error | null;
}

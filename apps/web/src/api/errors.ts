export type ApiErrorCode =
  | "missing_access_token"
  | "bad_request"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "server_error"
  | "http_error"
  | "timeout"
  | "network"
  | "invalid_json";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * True when the API (or the token lookup that precedes it) says the caller is no
 * longer authenticated. Amplify refreshes tokens on its own, so reaching this means
 * the refresh token is gone or expired and the user has to sign in again.
 */
export function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

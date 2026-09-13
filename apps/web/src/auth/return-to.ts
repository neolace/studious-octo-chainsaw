const storageKey = "auth:returnTo";

/** Same-origin absolute paths only — anything else would be an open redirect. */
export function isSafeReturnPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}

/**
 * Remember where an unauthenticated visitor was heading so the OAuth round trip
 * can land them back there. Survives the redirect because it lives in
 * sessionStorage; it is a path, never a token.
 */
export function rememberReturnTo(path: string | undefined): void {
  if (!isSafeReturnPath(path) || path === "/login" || path.startsWith("/auth/")) {
    return;
  }
  try {
    sessionStorage.setItem(storageKey, path);
  } catch {
    // Storage can be unavailable (private mode, disabled); falling back to "/" is fine.
  }
}

/** Read and clear the remembered path; defaults to the home page. */
export function takeReturnTo(): string {
  try {
    const value = sessionStorage.getItem(storageKey);
    sessionStorage.removeItem(storageKey);
    return isSafeReturnPath(value) ? value : "/";
  } catch {
    return "/";
  }
}

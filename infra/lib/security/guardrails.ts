import type { AppConfig } from "../config/types";
import { isProduction } from "../config/types";

/** Default per-stage throttling applied to every route on the HTTP API. */
export const apiThrottle = {
  burstLimit: 50,
  rateLimit: 25,
} as const;

function isLocalhost(url: URL): boolean {
  return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}

function assertHttpsOutsideLocalhost(name: string, value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL; received "${value}".`);
  }

  if (url.protocol !== "https:" && !isLocalhost(url)) {
    throw new Error(`${name} must use https outside localhost; received "${value}".`);
  }
}

/**
 * Fail synth when configuration would produce an insecure deployment.
 * Every value here ends up in a Cognito redirect allowlist or a CORS origin,
 * so it is validated up front rather than discovered after deploy.
 */
export function assertSecureConfig(config: AppConfig): void {
  if (isProduction(config) && config.frontendUrl.includes("*")) {
    throw new Error("Production CORS origins cannot be wildcarded.");
  }

  assertHttpsOutsideLocalhost("FRONTEND_URL", config.frontendUrl);
  assertHttpsOutsideLocalhost("FRONTEND_CALLBACK_URL", config.frontendCallbackUrl);
  assertHttpsOutsideLocalhost("FRONTEND_LOGOUT_URL", config.frontendLogoutUrl);

  if (isProduction(config) && isLocalhost(new URL(config.frontendUrl))) {
    throw new Error("Production FRONTEND_URL cannot point at localhost.");
  }
}

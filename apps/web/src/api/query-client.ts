import { QueryCache, QueryClient } from "@tanstack/react-query";

import { isSessionExpiredError } from "./errors";

/**
 * One client for the whole app. A 401 from any query means the Cognito session can
 * no longer produce an access token, so the auth layer is told to end the session
 * instead of every screen handling it on its own.
 */
export function createQueryClient(options: { onSessionExpired: () => void }): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isSessionExpiredError(error)) {
          options.onSessionExpired();
        }
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

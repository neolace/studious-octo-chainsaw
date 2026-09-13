import { QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";

import { createQueryClient } from "./query-client";
import { useAuth } from "../auth/useAuth";

/** Must sit inside AuthProvider: API 401s end the session through it. */
export function ApiProvider({ children }: { children: ReactNode }) {
  const { expireSession } = useAuth();
  const [queryClient] = useState(() =>
    createQueryClient({ onSessionExpired: () => void expireSession() }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

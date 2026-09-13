import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import type { CurrentUser } from "../api/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<CurrentUser>("/v1/me"),
  });
}

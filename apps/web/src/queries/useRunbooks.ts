import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "../api/client";
import type { Runbook } from "../api/types";

export function useRunbooks() {
  return useQuery({
    queryKey: ["runbooks"],
    queryFn: () => apiFetch<Runbook[]>("/v1/runbooks"),
  });
}

export function useRunbook(id: string | undefined) {
  return useQuery({
    queryKey: ["runbooks", id],
    queryFn: () => apiFetch<Runbook>(`/v1/runbooks/${id}`),
    enabled: Boolean(id),
  });
}

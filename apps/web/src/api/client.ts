import { fetchAuthSession } from "aws-amplify/auth";

import { ApiError, type ApiErrorCode } from "./errors";
import { env } from "../config/env";

const timeoutMs = 15_000;

export async function getAccessToken(): Promise<string> {
  const session = await fetchAuthSession();
  const accessToken = session.tokens?.accessToken?.toString();
  if (!accessToken) {
    throw new ApiError("missing_access_token", "Access token is required.", 401);
  }
  return accessToken;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();
    const data = parseJson(text, response.status);

    if (!response.ok) {
      throw new ApiError(
        statusCode(response.status),
        problemDetail(data, response.status),
        response.status,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("timeout", "The request timed out.", 408);
    }
    throw new ApiError("network", "The request failed.", 0);
  } finally {
    clearTimeout(timer);
  }
}

function parseJson(text: string, status: number): unknown {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError("invalid_json", "The server returned invalid JSON.", status);
  }
}

function problemDetail(data: unknown, status: number): string {
  if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string") {
    return data.detail;
  }
  return `Request failed with status ${status}.`;
}

const codesByStatus: Readonly<Record<number, ApiErrorCode>> = {
  400: "bad_request",
  401: "unauthorized",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  429: "rate_limited",
  500: "server_error",
};

function statusCode(status: number): ApiErrorCode {
  return codesByStatus[status] ?? "http_error";
}

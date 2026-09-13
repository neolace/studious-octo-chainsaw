import { fetchAuthSession } from "aws-amplify/auth";
import { expect, test, vi } from "vitest";

import { apiFetch, getAccessToken } from "../src/api/client";
import { ApiError, isSessionExpiredError } from "../src/api/errors";

const fetchAuthSessionMock = vi.mocked(fetchAuthSession);

function session(tokens: { accessToken?: string; idToken?: string }) {
  fetchAuthSessionMock.mockResolvedValue({
    tokens: {
      accessToken: tokens.accessToken ? { toString: () => tokens.accessToken } : undefined,
      idToken: tokens.idToken ? { toString: () => tokens.idToken } : undefined,
    },
  } as never);
}

test("sends the access token and not the ID token", async () => {
  session({ accessToken: "access-token", idToken: "id-token" });
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ subject: "user-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);

  await apiFetch("/v1/me");

  const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers as HeadersInit);
  expect(headers.get("Authorization")).toBe("Bearer access-token");
  expect(headers.get("Authorization")).not.toContain("id-token");
});

test("throws when the access token is missing", async () => {
  session({ idToken: "id-token" });
  await expect(getAccessToken()).rejects.toMatchObject({
    code: "missing_access_token",
    status: 401,
  });
});

test("maps 401 and 403 without swallowing them", async () => {
  session({ accessToken: "access-token" });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 403 })),
  );

  await expect(apiFetch("/v1/me")).rejects.toBeInstanceOf(ApiError);
  await expect(apiFetch("/v1/runbooks")).rejects.toMatchObject({ status: 403, code: "forbidden" });
});

test("only 401s count as an expired session", () => {
  expect(isSessionExpiredError(new ApiError("unauthorized", "no", 401))).toBe(true);
  expect(isSessionExpiredError(new ApiError("missing_access_token", "no", 401))).toBe(true);
  expect(isSessionExpiredError(new ApiError("forbidden", "no", 403))).toBe(false);
  expect(isSessionExpiredError(new Error("boom"))).toBe(false);
});

test("does not log authorization material", async () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  session({ accessToken: "access-token", idToken: "id-token" });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })),
  );

  await apiFetch("/v1/me");

  const printed = [...error.mock.calls, ...log.mock.calls].flat().join(" ");
  expect(printed).not.toContain("access-token");
  expect(printed).not.toContain("id-token");
  expect(printed).not.toContain("Bearer");
});

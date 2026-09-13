import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from "aws-amplify/auth";
import { afterEach, beforeEach, vi } from "vitest";

vi.mock("aws-amplify", () => ({
  Amplify: { configure: vi.fn() },
}));

vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn(() => () => undefined),
  },
}));

vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
  fetchAuthSession: vi.fn(),
}));

/** Baseline: nobody is signed in, but a session — once there is one — can mint an access token. */
beforeEach(() => {
  vi.mocked(getCurrentUser).mockRejectedValue(new Error("unauthenticated"));
  vi.mocked(fetchAuthSession).mockResolvedValue({
    tokens: { accessToken: { toString: () => "access-token" } },
  } as never);
  vi.mocked(signInWithRedirect).mockResolvedValue(undefined as never);
  vi.mocked(signOut).mockResolvedValue(undefined as never);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

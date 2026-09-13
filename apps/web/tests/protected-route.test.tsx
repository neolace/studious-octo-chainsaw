import { render, screen } from "@testing-library/react";
import { getCurrentUser } from "aws-amplify/auth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type * as ReactRouterDom from "react-router-dom";
import { expect, test, vi } from "vitest";

import { AuthProvider } from "../src/auth/AuthProvider";
import { ProtectedRoute } from "../src/auth/ProtectedRoute";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof ReactRouterDom>("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to, state }: { to: string; state?: { from?: string } }) => (
      <p>
        redirect:{to} from:{state?.from}
      </p>
    ),
  };
});

const getCurrentUserMock = vi.mocked(getCurrentUser);

function renderRoute(authenticated: boolean, path = "/") {
  if (authenticated) {
    getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  }

  render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <p>secret</p>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("sends unauthenticated users to login, remembering where they were", async () => {
  renderRoute(false, "/runbooks?tab=all");
  expect(await screen.findByText("redirect:/login from:/runbooks?tab=all")).toBeInTheDocument();
});

test("renders protected content when authenticated", async () => {
  renderRoute(true);
  expect(await screen.findByText("secret")).toBeInTheDocument();
});

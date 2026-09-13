import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getCurrentUser, signOut } from "aws-amplify/auth";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";

import { ApiProvider } from "../src/api/ApiProvider";
import { AuthProvider, SESSION_EXPIRED_MESSAGE } from "../src/auth/AuthProvider";
import { ProtectedRoute } from "../src/auth/ProtectedRoute";
import { HomePage } from "../src/pages/HomePage";
import { LoginPage } from "../src/pages/LoginPage";

const getCurrentUserMock = vi.mocked(getCurrentUser);
const signOutMock = vi.mocked(signOut);

function renderHome() {
  getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuthProvider>
        <ApiProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </ApiProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("an API 401 ends the session and sends the user back to sign in", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
  renderHome();
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
  expect(signOutMock).toHaveBeenCalled();
});

test("an API 403 is shown in place without ending the session", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
  renderHome();
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load your profile");
  expect(screen.getByRole("heading", { name: "Welcome" })).toBeInTheDocument();
  expect(signOutMock).not.toHaveBeenCalled();
});

test("logout is available when authenticated", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          subject: "user-1",
          email: "ada@example.com",
          displayName: "Ada",
          scopes: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
  );
  renderHome();
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Sign out" }));
  expect(signOutMock).toHaveBeenCalled();
});

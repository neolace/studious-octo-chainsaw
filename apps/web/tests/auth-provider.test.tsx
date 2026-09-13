import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fetchAuthSession, getCurrentUser, signOut } from "aws-amplify/auth";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";

import { AuthProvider, SESSION_EXPIRED_MESSAGE } from "../src/auth/AuthProvider";
import { useAuth } from "../src/auth/useAuth";

const getCurrentUserMock = vi.mocked(getCurrentUser);
const fetchAuthSessionMock = vi.mocked(fetchAuthSession);
const signOutMock = vi.mocked(signOut);

function Probe() {
  const auth = useAuth();
  if (auth.isLoading) {
    return <p>loading</p>;
  }
  return (
    <div>
      <p>{auth.isAuthenticated ? "in" : "out"}</p>
      {auth.error ? <p role="alert">{auth.error.message}</p> : null}
      <button type="button" onClick={() => void auth.logout()}>
        logout
      </button>
      <button type="button" onClick={() => void auth.expireSession()}>
        expire
      </button>
    </div>
  );
}

function renderProbe() {
  render(
    <MemoryRouter>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("restores an existing Cognito session", async () => {
  getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  renderProbe();
  expect(await screen.findByText("in")).toBeInTheDocument();
});

test("a cached user whose session cannot mint an access token is signed out as expired", async () => {
  getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  fetchAuthSessionMock.mockResolvedValue({ tokens: undefined } as never);
  renderProbe();
  expect(await screen.findByText("out")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
  expect(signOutMock).toHaveBeenCalled();
});

test("expireSession signs out locally and explains why", async () => {
  getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  const user = userEvent.setup();
  renderProbe();
  await user.click(await screen.findByRole("button", { name: "expire" }));
  expect(await screen.findByText("out")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent(SESSION_EXPIRED_MESSAGE);
  expect(signOutMock).toHaveBeenCalledTimes(1);
});

test("logout clears the session", async () => {
  getCurrentUserMock.mockResolvedValue({ username: "ada", userId: "user-1" } as never);
  const user = userEvent.setup();
  renderProbe();
  await user.click(await screen.findByRole("button", { name: "logout" }));
  expect(await screen.findByText("out")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

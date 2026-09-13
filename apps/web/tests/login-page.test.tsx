import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signInWithRedirect } from "aws-amplify/auth";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";

import { AuthProvider } from "../src/auth/AuthProvider";
import { takeReturnTo } from "../src/auth/return-to";
import { LoginPage } from "../src/pages/LoginPage";

const signInWithRedirectMock = vi.mocked(signInWithRedirect);

function renderLogin(state?: { from?: unknown }) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/login", state }]}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("renders the Microsoft sign-in action", async () => {
  renderLogin();

  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in with Microsoft" })).toBeEnabled();
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
});

test("invokes Cognito federated redirect with MicrosoftEntraID", async () => {
  const user = userEvent.setup();
  renderLogin();

  await user.click(await screen.findByRole("button", { name: "Sign in with Microsoft" }));

  expect(signInWithRedirectMock).toHaveBeenCalledWith({
    provider: { custom: "MicrosoftEntraID" },
  });
});

test("remembers where the visitor was heading, but only same-origin paths", async () => {
  const user = userEvent.setup();
  renderLogin({ from: "/runbooks?tab=all" });
  await user.click(await screen.findByRole("button", { name: "Sign in with Microsoft" }));
  expect(takeReturnTo()).toBe("/runbooks?tab=all");

  renderLogin({ from: "//evil.example.com/phish" });
  await user.click((await screen.findAllByRole("button", { name: "Sign in with Microsoft" }))[1]!);
  expect(takeReturnTo()).toBe("/");
});

test("shows a loading state while redirecting", async () => {
  signInWithRedirectMock.mockImplementation(() => new Promise(() => undefined));
  const user = userEvent.setup();
  renderLogin();

  await user.click(await screen.findByRole("button", { name: "Sign in with Microsoft" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Redirecting to Microsoft");
});

test("shows an error when sign-in fails", async () => {
  signInWithRedirectMock.mockRejectedValue(new Error("IdP unavailable"));
  const user = userEvent.setup();
  renderLogin();

  await user.click(await screen.findByRole("button", { name: "Sign in with Microsoft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("IdP unavailable");
});

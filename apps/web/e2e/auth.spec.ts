import { expect, test } from "@playwright/test";

test("unauthenticated visitors see the Microsoft login page", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in with Microsoft" })).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

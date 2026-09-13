import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_CHANNEL
          ? { channel: process.env.PLAYWRIGHT_CHANNEL }
          : process.env.CI
            ? {}
            : { channel: "msedge" }),
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    env: {
      VITE_AWS_REGION: process.env.VITE_AWS_REGION ?? "<AWS_REGION>",
      VITE_COGNITO_USER_POOL_ID: process.env.VITE_COGNITO_USER_POOL_ID ?? "<COGNITO_USER_POOL_ID>",
      VITE_COGNITO_CLIENT_ID: process.env.VITE_COGNITO_CLIENT_ID ?? "<COGNITO_CLIENT_ID>",
      VITE_COGNITO_DOMAIN: process.env.VITE_COGNITO_DOMAIN ?? "<COGNITO_DOMAIN>",
      VITE_API_URL: process.env.VITE_API_URL ?? "http://localhost:5080",
      VITE_COGNITO_REDIRECT_SIGN_IN:
        process.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? "http://localhost:5173/auth/callback",
      VITE_COGNITO_REDIRECT_SIGN_OUT:
        process.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? "http://localhost:5173/",
    },
  },
});

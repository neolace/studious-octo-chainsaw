import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: {
      VITE_COGNITO_USER_POOL_ID: "<COGNITO_USER_POOL_ID>",
      VITE_COGNITO_CLIENT_ID: "<COGNITO_CLIENT_ID>",
      VITE_COGNITO_DOMAIN: "<COGNITO_DOMAIN>",
      VITE_API_URL: "http://localhost:5080",
      VITE_COGNITO_REDIRECT_SIGN_IN: "http://localhost:5173/auth/callback",
      VITE_COGNITO_REDIRECT_SIGN_OUT: "http://localhost:5173/",
    },
  },
});

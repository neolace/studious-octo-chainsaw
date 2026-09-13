import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ApiProvider } from "./api/ApiProvider";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RunbooksPage } from "./pages/RunbooksPage";

export function App() {
  return (
    <AuthProvider>
      <ApiProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/runbooks"
              element={
                <ProtectedRoute>
                  <RunbooksPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ApiProvider>
    </AuthProvider>
  );
}

import { createBrowserRouter, Navigate } from "react-router";

import { ProtectedRoute } from "../features/auth/protected-route";
import { AppShell } from "../layouts/app-shell";
import { AuthLayout } from "../layouts/auth-layout";
import {
  DashboardPage,
  ForgotPasswordPage,
  InvitationPage,
  LoginPage,
  NotFoundPage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  SettingsPage,
  ShareLinkPage,
  WhiteboardPage,
} from "./lazy-pages";
import { RouteDocument } from "./route-document";

export const router = createBrowserRouter([
  {
    element: <RouteDocument />,
    children: [
      {
        path: "/",
        element: <Navigate replace to="/dashboard" />,
      },
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
          { path: "/forgot-password", element: <ForgotPasswordPage /> },
          { path: "/reset-password", element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: "/dashboard", element: <DashboardPage /> },
              { path: "/boards/recent", element: <DashboardPage /> },
              { path: "/boards/shared", element: <DashboardPage /> },
              { path: "/profile", element: <ProfilePage /> },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
          { path: "/board/:boardId", element: <WhiteboardPage /> },
          { path: "/invite/:token", element: <InvitationPage /> },
          { path: "/share/:token", element: <ShareLinkPage /> },
        ],
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]);

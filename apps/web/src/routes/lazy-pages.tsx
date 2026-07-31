import { lazy } from "react";

export const DashboardPage = lazy(async () => ({
  default: (await import("../pages/dashboard-page")).DashboardPage,
}));
export const LoginPage = lazy(async () => ({
  default: (await import("../pages/login-page")).LoginPage,
}));
export const InvitationPage = lazy(async () => ({
  default: (await import("../pages/invitation-page")).InvitationPage,
}));
export const NotFoundPage = lazy(async () => ({
  default: (await import("../pages/not-found-page")).NotFoundPage,
}));
export const ForgotPasswordPage = lazy(async () => ({
  default: (await import("../pages/password-pages")).ForgotPasswordPage,
}));
export const ResetPasswordPage = lazy(async () => ({
  default: (await import("../pages/password-pages")).ResetPasswordPage,
}));
export const ProfilePage = lazy(async () => ({
  default: (await import("../pages/profile-page")).ProfilePage,
}));
export const RegisterPage = lazy(async () => ({
  default: (await import("../pages/register-page")).RegisterPage,
}));
export const SettingsPage = lazy(async () => ({
  default: (await import("../pages/settings-page")).SettingsPage,
}));
export const ShareLinkPage = lazy(async () => ({
  default: (await import("../pages/share-link-page")).ShareLinkPage,
}));
export const WhiteboardPage = lazy(async () => ({
  default: (await import("../pages/whiteboard-page")).WhiteboardPage,
}));

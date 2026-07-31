export function getRouteTitle(pathname: string): string {
  if (pathname === "/login") return "Sign in — CollabCanvas";
  if (pathname === "/register") return "Create account — CollabCanvas";
  if (pathname === "/forgot-password") return "Reset password — CollabCanvas";
  if (pathname === "/reset-password") return "Choose password — CollabCanvas";
  if (pathname === "/dashboard" || pathname.startsWith("/boards/")) {
    return "Boards — CollabCanvas";
  }
  if (pathname === "/profile") return "Profile — CollabCanvas";
  if (pathname === "/settings") return "Settings — CollabCanvas";
  if (pathname.startsWith("/board/")) return "Board — CollabCanvas";
  if (pathname.startsWith("/invite/")) return "Board invitation — CollabCanvas";
  if (pathname.startsWith("/share/")) return "Shared board — CollabCanvas";
  return "Page not found — CollabCanvas";
}

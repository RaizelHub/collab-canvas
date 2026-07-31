import { LayoutGrid, LogOut, Moon, UserRound, Sun } from "lucide-react";
import { Link, Outlet } from "react-router";

import { BrandMark } from "../components/brand-mark";
import { useAuth } from "../features/auth/auth-context";
import { useTheme } from "../hooks/use-theme";

export function AppShell() {
  const { theme, toggleTheme } = useTheme();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <a
        className="fixed left-3 top-3 z-[100] -translate-y-20 bg-accent px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="border-b border-line bg-panel">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <Link
            aria-label="CollabCanvas dashboard"
            className="flex shrink-0 items-center gap-2.5 font-semibold tracking-[-0.02em]"
            to="/"
          >
            <BrandMark />
            <span className="hidden sm:inline">CollabCanvas</span>
          </Link>

          <Link
            className="ml-2 hidden items-center gap-2 text-sm text-muted hover:text-ink sm:flex"
            to="/dashboard"
          >
            <LayoutGrid aria-hidden="true" className="size-4" />
            Dashboard
          </Link>

          <button
            aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
            className="ml-auto grid size-9 shrink-0 place-items-center border border-line bg-panel text-muted transition hover:bg-hover hover:text-ink"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" className="size-4" />
            ) : (
              <Sun aria-hidden="true" className="size-4" />
            )}
          </button>

          <details className="relative">
            <summary
              aria-label="Open user menu"
              className="grid size-9 cursor-pointer list-none place-items-center rounded-full bg-avatar text-avatar-ink"
            >
              <UserRound aria-hidden="true" className="size-4" />
            </summary>
            <div className="absolute right-0 top-11 z-30 w-64 border border-line bg-panel p-2 text-sm shadow-lg">
              <p className="truncate px-2 py-2 text-xs text-muted">
                {user?.email}
              </p>
              <Link className="block px-2 py-2 hover:bg-hover" to="/profile">
                Profile
              </Link>
              <Link className="block px-2 py-2 hover:bg-hover" to="/settings">
                Settings
              </Link>
              <button
                className="flex w-full items-center gap-2 px-2 py-2 text-left text-danger hover:bg-danger-soft"
                onClick={() => void signOut()}
                type="button"
              >
                <LogOut aria-hidden="true" className="size-4" />
                Sign out
              </button>
            </div>
          </details>
        </div>
      </header>

      <div id="main-content" tabIndex={-1}>
        <Outlet />
      </div>
    </div>
  );
}

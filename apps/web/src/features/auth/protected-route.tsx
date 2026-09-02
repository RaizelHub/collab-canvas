import { Navigate, Outlet, useLocation } from "react-router";

import { useAuth } from "./auth-context";

export function ProtectedRoute() {
  const { configured, loading, user } = useAuth();
  const location = useLocation();

  const isDemoRoute =
    location.pathname.includes("demo-sandbox-showcase") ||
    location.search.includes("demo=true");

  if (isDemoRoute) {
    return <Outlet />;
  }

  if (!configured) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
        <div className="max-w-md border border-line bg-panel p-6">
          <h1 className="text-lg font-semibold">Supabase setup required</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Add <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_ANON_KEY</code> to{" "}
            <code>apps/web/.env.local</code>, then restart the development
            server.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main
        aria-live="polite"
        className="grid min-h-screen place-items-center bg-canvas text-sm text-muted"
      >
        Restoring session…
      </main>
    );
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`;
    return (
      <Navigate
        replace
        state={{ from: redirect }}
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
      />
    );
  }

  return <Outlet />;
}

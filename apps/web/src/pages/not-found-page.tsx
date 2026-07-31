import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <div className="text-center">
        <p className="text-sm font-medium text-muted">404</p>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <Link
          className="mt-5 inline-flex bg-accent px-3 py-2 text-sm font-medium text-white"
          to="/"
        >
          Back to boards
        </Link>
      </div>
    </main>
  );
}

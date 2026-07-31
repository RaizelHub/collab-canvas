import { Link, Outlet } from "react-router";

import { BrandMark } from "../components/brand-mark";

export function AuthLayout() {
  return (
    <main className="grid min-h-screen bg-canvas px-4 py-10 text-ink">
      <div className="mx-auto w-full max-w-sm self-center">
        <Link
          className="mb-8 flex items-center justify-center gap-2.5 font-semibold"
          to="/"
        >
          <BrandMark />
          CollabCanvas
        </Link>
        <section className="border border-line bg-panel p-6 shadow-sm">
          <Outlet />
        </section>
      </div>
    </main>
  );
}

import { Suspense } from "react";
import { RouterProvider } from "react-router";

import { AuthProvider } from "./features/auth/auth-provider";
import { router } from "./routes/router";

export function App() {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <main className="grid min-h-screen place-items-center bg-canvas text-sm text-muted">
            Opening portfolio…
          </main>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
    </AuthProvider>
  );
}

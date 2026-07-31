import { Moon, Sun } from "lucide-react";

import { useTheme } from "../hooks/use-theme";

export function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-sm font-semibold">Appearance</h2>
        <button
          className="mt-3 flex h-10 items-center gap-2 border border-line bg-panel px-3 text-sm hover:bg-hover"
          onClick={toggleTheme}
          type="button"
        >
          {theme === "light" ? (
            <Moon aria-hidden="true" className="size-4" />
          ) : (
            <Sun aria-hidden="true" className="size-4" />
          )}
          Use {theme === "light" ? "dark" : "light"} mode
        </button>
      </section>
    </main>
  );
}

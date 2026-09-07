import { ArrowRight, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

import { useAuth } from "../features/auth/auth-context";
import { getSafeRedirect } from "../features/auth/safe-redirect";

export function LoginPage() {
  const { configured, error, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.error) {
      navigate(getSafeRedirect(searchParams.get("redirect")), {
        replace: true,
      });
    }
  };

  return (
    <>
      <div className="mb-5 rounded-2xl border-2 border-accent/40 bg-accent/5 p-4 neo-box-shadow">
        <div className="flex items-center gap-2 text-xs font-bold text-accent">
          <Sparkles className="size-4" />
          <span>Want to explore without signing up?</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Jump directly into an interactive collaborative sandbox canvas.
        </p>
        <Link
          className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-bold text-white transition hover:bg-accent-strong"
          to="/demo"
        >
          <span>Launch Instant Free Sandbox</span>
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Open your boards and continue working.
      </p>
      {!configured && (
        <p className="mt-4 rounded-xl border-l-2 border-accent bg-canvas px-3 py-2 text-sm text-muted">
          Supabase environment values are required before cloud sign-in can
          work.
        </p>
      )}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1.5 h-10 w-full rounded-xl border border-line bg-canvas px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input
            autoComplete="current-password"
            className="mt-1.5 h-10 w-full rounded-xl border border-line bg-canvas px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            minLength={8}
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          className="h-10 w-full rounded-xl bg-accent text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60 transition"
          disabled={!configured || submitting}
          type="submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link
          className="text-accent hover:underline font-medium"
          to="/register"
        >
          Create account
        </Link>
        <Link className="text-muted hover:text-ink" to="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </>
  );
}

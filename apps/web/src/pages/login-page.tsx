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
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">
        Open your boards and continue working.
      </p>
      {!configured && (
        <p className="mt-4 border-l-2 border-accent bg-canvas px-3 py-2 text-sm text-muted">
          Supabase environment values are required before sign-in can work.
        </p>
      )}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Email
          <input
            autoComplete="email"
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
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
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
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
          className="h-10 w-full bg-accent text-sm font-medium text-white hover:bg-accent-strong disabled:opacity-60"
          disabled={!configured || submitting}
          type="submit"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-5 flex justify-between text-sm">
        <Link className="text-accent hover:underline" to="/register">
          Create account
        </Link>
        <Link className="text-muted hover:text-ink" to="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </>
  );
}

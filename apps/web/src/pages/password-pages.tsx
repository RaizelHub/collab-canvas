import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";

import { useAuth } from "../features/auth/auth-context";

export function ForgotPasswordPage() {
  const { configured, error, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await requestPasswordReset(email.trim());
    if (!result.error) setSent(true);
  };

  return (
    <>
      <h1 className="text-xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Enter your email. If an account exists, Supabase will send a reset link.
      </p>
      {sent ? (
        <p className="mt-5 border-l-2 border-accent bg-canvas px-3 py-2 text-sm">
          Check your email for a password reset link.
        </p>
      ) : (
        <form className="mt-5 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium">
            Email
            <input
              autoComplete="email"
              className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
          <button
            className="h-10 w-full bg-accent text-sm font-medium text-white disabled:opacity-60"
            disabled={!configured}
            type="submit"
          >
            Send reset link
          </button>
        </form>
      )}
      <Link
        className="mt-5 inline-block text-sm text-muted hover:text-ink"
        to="/login"
      >
        Back to sign in
      </Link>
    </>
  );
}

export function ResetPasswordPage() {
  const { error, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await updatePassword(password);
    if (!result.error) navigate("/dashboard", { replace: true });
  };

  return (
    <>
      <h1 className="text-xl font-semibold">Choose a new password</h1>
      <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-medium">
          New password
          <input
            autoComplete="new-password"
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal"
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
          className="h-10 w-full bg-accent text-sm font-medium text-white"
          type="submit"
        >
          Update password
        </button>
      </form>
    </>
  );
}

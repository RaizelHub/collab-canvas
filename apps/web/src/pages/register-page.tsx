import { useState, type FormEvent } from "react";
import { Link } from "react-router";

import { useAuth } from "../features/auth/auth-context";

export function RegisterPage() {
  const { configured, error, signUp } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await signUp(email.trim(), password, displayName);
    setSubmitting(false);
    if (!result.error) setSubmitted(true);
  };

  if (submitted) {
    return (
      <>
        <h1 className="text-xl font-semibold">Check your email</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use the verification link sent to {email} before signing in.
        </p>
        <Link
          className="mt-5 inline-flex h-9 items-center bg-accent px-3 text-sm font-medium text-white"
          to="/login"
        >
          Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Create account</h1>
      <p className="mt-1 text-sm text-muted">
        Use your work email and a display name.
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium">
          Display name
          <input
            autoComplete="name"
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
            maxLength={80}
            minLength={2}
            onChange={(event) => setDisplayName(event.target.value)}
            required
            value={displayName}
          />
        </label>
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
            autoComplete="new-password"
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
          className="h-10 w-full bg-accent text-sm font-medium text-white disabled:opacity-60"
          disabled={!configured || submitting}
          type="submit"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-sm text-muted">
        Already registered?{" "}
        <Link className="text-accent hover:underline" to="/login">
          Sign in
        </Link>
      </p>
    </>
  );
}

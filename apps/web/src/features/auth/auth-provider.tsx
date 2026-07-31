import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "../../lib/supabase";
import {
  AuthContext,
  type AuthContextValue,
  type AuthResult,
} from "./auth-context";

interface AuthProviderProps {
  children: ReactNode;
  client?: SupabaseClient | null;
}

export function AuthProvider({
  children,
  client = supabase,
}: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(client !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!client) {
      return;
    }

    let active = true;
    client.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!active) return;
        if (sessionError) {
          console.error("Supabase session recovery failed.", sessionError);
          setError("Your session could not be restored. Please sign in again.");
        }
        setSession(data.session);
        setLoading(false);
      })
      .catch((sessionError: unknown) => {
        if (!active) return;
        console.error("Supabase session recovery failed.", sessionError);
        setError("Your session could not be restored. Please sign in again.");
        setLoading(false);
      });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const runAuthOperation = useCallback(
    async (
      operation: () => Promise<{ error: { message: string } | null }>,
    ): Promise<AuthResult> => {
      setError(null);
      try {
        const result = await operation();
        if (result.error) {
          setError(result.error.message);
          return { error: result.error.message };
        }
        return { error: null };
      } catch (operationError) {
        console.error(
          "Supabase authentication request failed.",
          operationError,
        );
        const message =
          "The authentication service could not be reached. Try again.";
        setError(message);
        return { error: message };
      }
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: client !== null,
      error,
      loading,
      session,
      user: session?.user ?? null,
      clearError: () => setError(null),
      signIn: (email, password) =>
        client
          ? runAuthOperation(() =>
              client.auth.signInWithPassword({ email, password }),
            )
          : Promise.resolve({ error: "Supabase is not configured." }),
      signUp: (email, password, displayName) =>
        client
          ? runAuthOperation(() =>
              client.auth.signUp({
                email,
                password,
                options: {
                  data: { display_name: displayName.trim() },
                  emailRedirectTo: `${window.location.origin}/dashboard`,
                },
              }),
            )
          : Promise.resolve({ error: "Supabase is not configured." }),
      signOut: () =>
        client
          ? runAuthOperation(() => client.auth.signOut())
          : Promise.resolve({ error: "Supabase is not configured." }),
      requestPasswordReset: (email) =>
        client
          ? runAuthOperation(() =>
              client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              }),
            )
          : Promise.resolve({ error: "Supabase is not configured." }),
      updatePassword: (password) =>
        client
          ? runAuthOperation(() => client.auth.updateUser({ password }))
          : Promise.resolve({ error: "Supabase is not configured." }),
    }),
    [client, error, loading, runAuthOperation, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

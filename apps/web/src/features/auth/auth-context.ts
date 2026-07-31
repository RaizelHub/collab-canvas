import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export interface AuthResult {
  error: string | null;
}

export interface AuthContextValue {
  configured: boolean;
  error: string | null;
  loading: boolean;
  session: Session | null;
  user: User | null;
  clearError: () => void;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}

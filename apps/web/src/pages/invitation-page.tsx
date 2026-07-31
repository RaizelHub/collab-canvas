import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { supabase } from "../lib/supabase";

function invitationMessage(message: string): string {
  if (message.includes("expired_invitation")) return "This invitation expired.";
  if (message.includes("revoked_invitation"))
    return "This invitation was revoked.";
  if (message.includes("used_invitation"))
    return "This invitation was already used.";
  if (message.includes("invitation_email_mismatch")) {
    return "Sign in with the email address that received this invitation.";
  }
  return "This invitation is invalid or no longer available.";
}

export function InvitationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "reject") => {
    if (!supabase || !token || busy) return;
    setBusy(action);
    setError(null);
    const functionName =
      action === "accept"
        ? "accept_board_invitation"
        : "reject_board_invitation";
    const { data, error: responseError } = await supabase.rpc(functionName, {
      invitation_token: token,
    });
    if (responseError) {
      console.error("Invitation response failed.", {
        action,
        code: responseError.code,
      });
      setError(invitationMessage(responseError.message));
      setBusy(null);
      return;
    }
    if (action === "accept" && typeof data === "string") {
      navigate(`/board/${data}`, { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <section className="w-full max-w-md border border-line bg-panel p-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Board invitation
        </p>
        <h1 className="mt-2 text-xl font-semibold">Join this board?</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Accept to add the board to your workspace. The invitation is tied to
          your signed-in email address.
        </p>
        {error && (
          <p
            className="mt-4 border-l-2 border-danger bg-danger-soft px-3 py-2 text-sm"
            role="alert"
          >
            {error}
          </p>
        )}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Link
            className="mr-auto text-sm text-muted underline"
            to="/dashboard"
          >
            Dashboard
          </Link>
          <button
            className="h-9 border border-line px-3 text-sm font-medium"
            disabled={busy !== null}
            onClick={() => void respond("reject")}
            type="button"
          >
            {busy === "reject" ? "Declining…" : "Decline"}
          </button>
          <button
            className="h-9 bg-accent px-3 text-sm font-medium text-white"
            disabled={busy !== null}
            onClick={() => void respond("accept")}
            type="button"
          >
            {busy === "accept" ? "Accepting…" : "Accept invitation"}
          </button>
        </div>
      </section>
    </main>
  );
}

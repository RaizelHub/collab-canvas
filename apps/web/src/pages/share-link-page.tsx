import { ArrowLeft, LoaderCircle, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { z } from "zod";

import { BrandMark } from "../components/brand-mark";
import { WhiteboardCanvas } from "../features/whiteboard/whiteboard-canvas";
import { getBoardPersistenceKey } from "../features/whiteboard/persistence-key";
import { syncServerUrl } from "../lib/env";
import { supabase } from "../lib/supabase";

const sharedBoardSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  role: z.enum(["editor", "viewer"]),
});

export function ShareLinkPage() {
  const { token } = useParams();
  const [board, setBoard] = useState<z.infer<typeof sharedBoardSchema> | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !syncServerUrl || !supabase) {
      queueMicrotask(() => setError("This share link cannot be opened."));
      return;
    }
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!data.session?.access_token) {
          throw new Error("Your session expired. Sign in again.");
        }
        const response = await fetch(`${syncServerUrl}/share/${token}`, {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
        const result: unknown = await response.json();
        const parsed = sharedBoardSchema.safeParse(result);
        if (!response.ok || !parsed.success) {
          throw new Error("This share link is invalid or was revoked.");
        }
        setBoard(parsed.data);
      })
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "This share link could not be opened.",
        );
      });
  }, [token]);

  if (!board) {
    return (
      <main className="grid h-dvh place-items-center bg-canvas p-6 text-ink">
        {error ? (
          <div className="text-center">
            <h1 className="text-xl font-semibold">Board unavailable</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <Link
              className="mt-5 inline-flex h-9 items-center border border-line px-3 text-sm"
              to="/dashboard"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <span className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle className="size-4 animate-spin" />
            Opening shared board
          </span>
        )}
      </main>
    );
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col bg-canvas text-ink">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <Link
          aria-label="Back to dashboard"
          className="grid size-8 place-items-center text-muted hover:bg-hover"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <BrandMark />
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold">
          {board.title}
        </h1>
        <span className="flex items-center gap-1 border border-line px-2 py-1 text-xs text-muted">
          <Users className="size-3.5" />
          {board.role}
        </span>
      </header>
      <div className="relative min-h-0 flex-1">
        <WhiteboardCanvas
          boardId={board.id}
          persistenceKey={getBoardPersistenceKey(board.id)}
          shareToken={token}
        />
      </div>
    </main>
  );
}

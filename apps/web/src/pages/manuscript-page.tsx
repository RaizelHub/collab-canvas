import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useAuth } from "../features/auth/auth-context";
import {
  openDocument,
  type DocumentSession,
} from "../features/pages/repository";
import { WritingStudio } from "../features/pages/writing-studio";
export function ManuscriptPage() {
  const { documentId } = useParams();
  const { user } = useAuth();
  if (!documentId || !user) return <p role="status">Opening manuscript…</p>;
  return (
    <ManuscriptSession
      key={`${user.id}:${documentId}`}
      documentId={documentId}
      userId={user.id}
    />
  );
}
function ManuscriptSession({
  documentId,
  userId,
}: {
  documentId: string;
  userId: string;
}) {
  const [session, setSession] = useState<DocumentSession | null>(null);
  const [status, setStatus] = useState("Opening manuscript…");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let opened: DocumentSession | undefined;
    void openDocument(documentId, userId, (s) => {
      if (active) setStatus(s);
    })
      .then((s) => {
        opened = s;
        if (active) setSession(s);
        else void s.close();
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      if (opened) void opened.close();
    };
  }, [documentId, userId]);
  if (error)
    return (
      <main className="pages-library">
        <h1>Couldn’t open this manuscript</h1>
        <p role="alert">{error}</p>
        <Link to="/pages">Back to Pages</Link>
      </main>
    );
  if (!session)
    return (
      <main className="pages-library" role="status">
        {status}
      </main>
    );
  return (
    <WritingStudio
      key={documentId}
      doc={session.doc}
      role={session.role}
      status={status}
      documentId={documentId}
      userId={userId}
      local={session.local}
    />
  );
}

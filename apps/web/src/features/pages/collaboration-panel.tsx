import { useEffect, useState } from "react";
import type * as Y from "yjs";
import type { Editor } from "@tiptap/core";
import { supabase } from "../../lib/supabase";
import { canComment, type DocumentRole, type Revision } from "./model";
import { readFormat, readSources, readStyle } from "./document-state";
export function RevisionPanel({
  doc,
  editor,
  writable,
  documentId,
  userId,
  local,
}: {
  doc: Y.Doc;
  editor: Editor;
  writable: boolean;
  documentId?: string;
  userId?: string;
  local: boolean;
}) {
  const [revisions, setRevisions] = useState<Revision[]>(() =>
    Array.from(doc.getMap<Revision>("revisions").values()).reverse(),
  );
  const [label, setLabel] = useState("Saved checkpoint");
  const [message, setMessage] = useState("");
  const [restore, setRestore] = useState<Revision | null>(null);
  useEffect(() => {
    let active = true;
    if (!local && documentId && supabase)
      void supabase
        .from("manuscript_revisions")
        .select("snapshot")
        .eq("document_id", documentId)
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data, error }) => {
          if (active) {
            if (error) setMessage(error.message);
            else setRevisions((data ?? []).map((r) => r.snapshot));
          }
        });
    return () => {
      active = false;
    };
  }, [documentId, local]);
  async function save(name: string) {
    const revision: Revision = {
      id: crypto.randomUUID(),
      label: name,
      created_at: new Date().toISOString(),
      content: editor.getJSON(),
      format: readFormat(doc),
      references: readSources(doc),
      style: readStyle(doc),
    };
    if (local) doc.getMap<Revision>("revisions").set(revision.id, revision);
    else {
      if (!supabase) throw new Error("Cloud unavailable");
      const { error } = await supabase.from("manuscript_revisions").insert({
        document_id: documentId,
        author_id: userId,
        snapshot: revision,
      });
      if (error) throw error;
    }
    setRevisions((r) => [revision, ...r]);
    return revision;
  }
  return (
    <div className="pages-form">
      <p>
        Autosave keeps current work. Named checkpoints preserve earlier content
        for recovery. Restoring replaces the shared manuscript; coordinate with
        collaborators first.
      </p>
      <label>
        Checkpoint name
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={120}
        />
      </label>
      <button
        disabled={!writable || !label.trim()}
        onClick={() =>
          void save(label)
            .then(() => setMessage("Checkpoint saved."))
            .catch((e) => setMessage(e.message))
        }
      >
        Save checkpoint
      </button>
      {revisions.map((r) => (
        <article className="pages-source-card" key={r.id}>
          <strong>{r.label}</strong>
          <small>{new Date(r.created_at).toLocaleString()}</small>
          <button disabled={!writable} onClick={() => setRestore(r)}>
            Restore this checkpoint…
          </button>
        </article>
      ))}
      {restore && (
        <div className="pages-source-card">
          <p>
            Replace the current manuscript with “{restore.label}”? A checkpoint
            of the current content will be saved first.
          </p>
          <div className="pages-button-row">
            <button
              onClick={() =>
                void save("Before restore")
                  .then(() => {
                    editor.commands.setContent(restore.content);
                    doc.transact(() => {
                      for (const [k, v] of Object.entries(restore.format))
                        doc.getMap("format").set(k, v);
                      doc.getMap("references").clear();
                      for (const source of restore.references)
                        doc.getMap("references").set(source.id, source);
                      doc.getMap("meta").set("style", restore.style);
                    });
                    setRestore(null);
                    setMessage("Checkpoint restored.");
                  })
                  .catch((e) => setMessage(e.message))
              }
            >
              Confirm restore
            </button>
            <button onClick={() => setRestore(null)}>Cancel</button>
          </div>
        </div>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
interface Comment {
  id: string;
  author_id: string;
  quote: string;
  body: string;
  resolved: boolean;
  created_at: string;
}
interface Member {
  user_id: string;
  role: string;
}
export function CollaborationPanel({
  documentId,
  userId,
  role,
  local,
  selection,
}: {
  documentId?: string;
  userId?: string;
  role: DocumentRole;
  local: boolean;
  selection: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState("editor");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (local || !documentId || !supabase) return;
    let active = true;
    const client = supabase;
    const refresh = async () => {
      const [a, b] = await Promise.all([
        client
          .from("manuscript_comments")
          .select("*")
          .eq("document_id", documentId)
          .order("created_at"),
        client
          .from("manuscript_members")
          .select("user_id,role")
          .eq("document_id", documentId),
      ]);
      if (active) {
        if (a.error || b.error)
          setMessage(a.error?.message ?? b.error?.message ?? "");
        else {
          setComments(a.data ?? []);
          setMembers(b.data ?? []);
        }
      }
    };
    void refresh();
    const timer = setInterval(() => void refresh(), 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [documentId, local]);
  if (local)
    return (
      <div className="pages-form">
        <p>
          This is a private browser draft. Create a cloud document from Pages to
          use sharing and comments. The cloud Pages migration must be deployed
          first.
        </p>
      </div>
    );
  return (
    <div className="pages-form">
      <p>
        Your access: <strong>{role}</strong>. Content and comments reconcile
        every 3 seconds. Comments retain the quoted text; they are not live
        positional annotations.
      </p>
      <label>
        Document link
        <input
          readOnly
          value={`${window.location.origin}/pages/${documentId}`}
        />
      </label>
      {role === "owner" && (
        <form
          className="pages-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase!.rpc("add_manuscript_member", {
              doc_id: documentId,
              member_email: email,
              member_role: memberRole,
            });
            setMessage(
              error
                ? error.message
                : "Access granted. Share the document link with this person.",
            );
          }}
        >
          <label>
            Registered collaborator’s email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Access
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value)}
            >
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
          <button>Grant / update access</button>
        </form>
      )}
      {members.map((m) => (
        <div className="pages-source-card" key={m.user_id}>
          <small>
            {m.user_id === userId ? "You" : m.user_id} · {m.role}
          </small>
          {role === "owner" && (
            <button
              onClick={async () => {
                const { error } = await supabase!
                  .from("manuscript_members")
                  .delete()
                  .eq("document_id", documentId)
                  .eq("user_id", m.user_id);
                setMessage(error?.message ?? "Access removed.");
              }}
            >
              Remove access
            </button>
          )}
        </div>
      ))}
      <h3>Comments</h3>
      {comments.map((c) => (
        <article className="pages-source-card" key={c.id}>
          <small>
            {c.author_id === userId ? "You" : c.author_id} ·{" "}
            {new Date(c.created_at).toLocaleString()}
          </small>
          {c.quote && <blockquote>{c.quote}</blockquote>}
          <p>{c.body}</p>
          <small>{c.resolved ? "Resolved" : "Open"}</small>
          {(role === "owner" || role === "editor" || c.author_id === userId) &&
            canComment(role) && (
              <button
                onClick={async () => {
                  const { error } = await supabase!
                    .from("manuscript_comments")
                    .update({ resolved: !c.resolved })
                    .eq("id", c.id);
                  if (error) setMessage(error.message);
                }}
              >
                Mark {c.resolved ? "open" : "resolved"}
              </button>
            )}
        </article>
      ))}
      {canComment(role) && (
        <form
          className="pages-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const { error } = await supabase!
              .from("manuscript_comments")
              .insert({
                document_id: documentId,
                author_id: userId,
                quote: selection.slice(0, 2000),
                body,
              });
            setMessage(error?.message ?? "Comment added.");
            if (!error) setBody("");
          }}
        >
          {selection && <blockquote>On: {selection.slice(0, 2000)}</blockquote>}
          <label>
            Comment
            <textarea
              required
              maxLength={4000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <button>Add comment</button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

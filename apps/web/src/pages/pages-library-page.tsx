import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { useAuth } from "../features/auth/auth-context";
import { ACADEMIC_TEMPLATES } from "../features/pages/templates";
import {
  createDocument,
  importRecovery,
  listDocuments,
  type DocumentSummary,
} from "../features/pages/repository";
import "../features/pages/pages.css";
export function PagesLibraryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("Untitled manuscript");
  const [local, setLocal] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    if (user)
      void listDocuments(user.id).then((result) => {
        if (active) {
          setDocuments(result.documents);
          setError(result.error);
        }
      });
    return () => {
      active = false;
    };
  }, [user]);
  async function create(template: string) {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const id = await createDocument(
        user.id,
        title.trim() || "Untitled manuscript",
        template,
        local,
      );
      navigate(`/pages/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Creation failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="pages-library">
      <div className="pages-library-heading">
        <div>
          <p className="pages-eyebrow">COLLABCANVAS / PAGES</p>
          <h1>Make room for your next chapter.</h1>
          <p>
            A thoughtful space for research, writing, and everything that
            follows.
          </p>
        </div>
        <Link to="/dashboard">
          Open Whiteboard <ArrowRightIcon />
        </Link>
      </div>
      <section className="pages-create" aria-labelledby="new-document">
        <h2 id="new-document">Start with a little structure</h2>
        <p>
          Adapt every section to your institution. Templates contain prompts,
          never research findings.
        </p>
        <div className="pages-create-fields">
          <label>
            Document title
            <input
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            Save location
            <select
              value={local ? "browser" : "cloud"}
              onChange={(e) => setLocal(e.target.value === "browser")}
            >
              <option value="cloud">Cloud · share with collaborators</option>
              <option value="browser">This browser · private draft</option>
            </select>
          </label>
        </div>
        {local && (
          <p>
            Browser drafts stay on this device and can be lost if browser data
            is cleared. Export recovery copies regularly.
          </p>
        )}
        {error && (
          <p role="alert" className="pages-error">
            {error}
          </p>
        )}
        <div className="pages-template-grid">
          {ACADEMIC_TEMPLATES.map((t) => (
            <button
              type="button"
              key={t.id}
              disabled={busy || !user}
              onClick={() => void create(t.id)}
            >
              <span style={{ background: t.color }}>
                <FileTextIcon weight="fill" size={26} />
              </span>
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <small>
                {busy ? "Creating…" : `${t.sections.length} editable sections`}{" "}
                <ArrowRightIcon />
              </small>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Your manuscripts</h2>
        <label className="pages-form">
          Recover a Pages backup as a new browser draft
          <input
            type="file"
            accept=".json"
            disabled={!user || busy}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !user) return;
              setBusy(true);
              try {
                navigate(`/pages/${await importRecovery(user.id, file)}`);
              } catch (error) {
                setError(
                  error instanceof Error ? error.message : "Recovery failed.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        {documents.length === 0 ? (
          <p className="pages-empty">Your next chapter starts above.</p>
        ) : (
          <div className="pages-document-list">
            {documents.map((d) => (
              <Link key={d.id} to={`/pages/${d.id}`}>
                <FileTextIcon size={28} weight="duotone" />
                <div>
                  <strong>{d.title}</strong>
                  <small>
                    {d.local ? "Browser draft" : "Cloud document"} ·{" "}
                    {new Date(d.created_at).toLocaleDateString()}
                  </small>
                </div>
                <ArrowRightIcon />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

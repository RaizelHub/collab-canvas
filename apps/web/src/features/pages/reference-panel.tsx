import { useState } from "react";
import type * as Y from "yjs";
import type { Editor } from "@tiptap/core";
import type { ReferenceSource, CitationStyle } from "./model";
import { readSources, readStyle } from "./document-state";
import { citationLabels, missingFields } from "./citations";
import { useDocumentRevision } from "./use-document";
const blank = (): ReferenceSource => ({
  id: crypto.randomUUID(),
  type: "book",
  title: "",
  authors: "",
  year: "",
  publisher: "",
  journal: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
});
export function ReferencePanel({
  doc,
  editor,
  writable,
}: {
  doc: Y.Doc;
  editor: Editor;
  writable: boolean;
}) {
  useDocumentRevision(doc);
  const sources = readSources(doc);
  const style = readStyle(doc);
  const [draft, setDraft] = useState(blank);
  const [message, setMessage] = useState("");
  function refresh(nextStyle: CitationStyle, nextSources: ReferenceSource[]) {
    const order: string[] = [];
    editor.state.doc.descendants((n) => {
      if (n.type.name === "citation") order.push(n.attrs.sourceId);
    });
    const labels = citationLabels(nextSources, nextStyle, order);
    const tr = editor.state.tr;
    editor.state.doc.descendants((n, p) => {
      if (n.type.name === "citation")
        tr.setNodeMarkup(p, undefined, {
          ...n.attrs,
          label: labels.get(n.attrs.sourceId) ?? "[Missing source]",
        });
    });
    if (tr.docChanged) editor.view.dispatch(tr);
  }
  return (
    <div className="pages-form">
      <label>
        Citation style
        <select
          disabled={!writable}
          value={style}
          onChange={(e) => {
            const value = e.target.value as CitationStyle;
            doc.getMap("meta").set("style", value);
            refresh(value, sources);
          }}
        >
          <option value="apa">APA 7</option>
          <option value="ieee">IEEE</option>
          <option value="mla">MLA</option>
        </select>
      </label>
      <p>
        Formatted with Citation.js and official CSL styles. Enter verified
        source details; nothing is fetched or invented. Bibliographies include
        every source in this library.
      </p>
      {sources.map((s) => (
        <article className="pages-source-card" key={s.id}>
          <strong>{s.title}</strong>
          <small>
            {s.authors} · {s.year || "Date not provided"}
          </small>
          {missingFields(s).length > 0 && (
            <small>Check missing: {missingFields(s).join(", ")}</small>
          )}
          <div className="pages-button-row">
            <button
              disabled={!writable}
              onClick={() => {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "citation",
                    attrs: { sourceId: s.id, label: "[Citation]" },
                  })
                  .run();
                refresh(style, sources);
                setMessage("Citation inserted at the cursor.");
              }}
            >
              Cite
            </button>
            <button disabled={!writable} onClick={() => setDraft({ ...s })}>
              Edit source
            </button>
            <button
              disabled={!writable}
              onClick={() => {
                doc.getMap("references").delete(s.id);
                refresh(
                  style,
                  sources.filter((x) => x.id !== s.id),
                );
              }}
            >
              Remove source
            </button>
          </div>
        </article>
      ))}
      <form
        className="pages-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim()) return;
          doc
            .getMap<ReferenceSource>("references")
            .set(draft.id, { ...draft, title: draft.title.trim() });
          refresh(style, [...sources.filter((s) => s.id !== draft.id), draft]);
          setDraft(blank());
          setMessage("Source saved. Verify all metadata before submission.");
        }}
      >
        <fieldset disabled={!writable}>
          <h3>
            {sources.some((s) => s.id === draft.id)
              ? "Edit source"
              : "Add a source"}
          </h3>
          <label>
            Source type
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  type: e.target.value as ReferenceSource["type"],
                })
              }
            >
              <option value="book">Book</option>
              <option value="article-journal">Journal article</option>
              <option value="webpage">Website</option>
              <option value="report">Report / other</option>
            </select>
          </label>
          {(
            [
              "title",
              "authors",
              "year",
              "publisher",
              "journal",
              "volume",
              "issue",
              "pages",
              "doi",
              "url",
            ] as const
          ).map((key) => (
            <label key={key}>
              {
                {
                  title: "Title",
                  authors: "Authors (Family, Given; Family, Given)",
                  year: "Publication year (YYYY)",
                  publisher: "Publisher",
                  journal: "Journal / website title",
                  volume: "Volume",
                  issue: "Issue",
                  pages: "Page range",
                  doi: "DOI",
                  url: "URL",
                }[key]
              }
              <input
                required={key === "title"}
                maxLength={key === "title" ? 1000 : 2000}
                pattern={key === "year" ? "[0-9]{4}" : undefined}
                type={key === "url" ? "url" : "text"}
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            </label>
          ))}
          <button type="submit">Save source</button>
        </fieldset>
      </form>
      <button
        disabled={!writable}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertContent({
              type: "generatedIndex",
              attrs: { kind: "bibliography" },
            })
            .run()
        }
      >
        Insert automatic reference list
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}

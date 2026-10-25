import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import type * as Y from "yjs";
import { Link } from "react-router";
import { FileTextIcon } from "@phosphor-icons/react/dist/csr/FileText";
import { ListIcon } from "@phosphor-icons/react/dist/csr/List";
import { BookOpenIcon } from "@phosphor-icons/react/dist/csr/BookOpen";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/csr/SlidersHorizontal";
import { PrinterIcon } from "@phosphor-icons/react/dist/csr/Printer";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpRight";
import { ImageIcon } from "@phosphor-icons/react/dist/csr/Image";
import { TableIcon } from "@phosphor-icons/react/dist/csr/Table";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { UsersIcon } from "@phosphor-icons/react/dist/csr/Users";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ClockCounterClockwise";
import { BrandMark } from "../../components/brand-mark";
import { AccessibleDialog } from "../../components/accessible-dialog";
import { academicExtensions } from "./extensions";
import { canWrite, paperDimensions, type DocumentRole } from "./model";
import {
  readFormat,
  readSources,
  readStyle,
  encodeUpdate,
} from "./document-state";
import { encodeStateAsUpdate } from "yjs";
import { useDocumentRevision } from "./use-document";
import { ensureAnchorIds, findMatches, getOutline } from "./editor-utils";
import { FormatPanel } from "./format-panel";
import { RevisionPanel, CollaborationPanel } from "./collaboration-panel";
import { downloadBlob } from "./download";
import "./pages.css";
const ReferencePanel = lazy(async () => ({
  default: (await import("./reference-panel")).ReferencePanel,
}));
const PrintLayout = lazy(async () => ({
  default: (await import("./print-layout")).PrintLayout,
}));

interface StudioProps {
  doc: Y.Doc;
  role: DocumentRole;
  status: string;
  documentId?: string;
  userId?: string;
  local?: boolean;
  demo?: boolean;
}
type Panel =
  | "format"
  | "references"
  | "find"
  | "insert"
  | "history"
  | "collaboration"
  | null;
export function WritingStudio({
  doc,
  role,
  status,
  documentId,
  userId,
  local = true,
  demo = false,
}: StudioProps) {
  useDocumentRevision(doc);
  const writable = canWrite(role);
  const format = readFormat(doc);
  const sources = readSources(doc);
  const style = readStyle(doc);
  const [panel, setPanel] = useState<Panel>(null);
  const [outlineOpen, setOutlineOpen] = useState(!demo);
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState("");
  const [find, setFind] = useState("");
  const [replacement, setReplacement] = useState("");
  const [insertText, setInsertText] = useState("");
  const [insertKind, setInsertKind] = useState("section");
  const [target, setTarget] = useState("");
  const [exporting, setExporting] = useState(false);
  const editor = useEditor(
    {
      extensions: [
        ...academicExtensions(true),
        Collaboration.configure({ document: doc, field: "content" }),
      ],
      editable: writable,
      editorProps: {
        attributes: {
          class: "manuscript-content",
          "aria-label": "Manuscript text",
          role: "textbox",
          "aria-multiline": "true",
          spellcheck: "true",
        },
      },
      onUpdate: ({ editor: e }) => {
        if (writable) ensureAnchorIds(e);
      },
    },
    [doc, writable],
  );
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });
  useEffect(() => {
    if (editor && writable) ensureAnchorIds(editor);
  }, [editor, writable]);
  const outline = editor ? getOutline(editor) : [];
  const dimensions = paperDimensions(format);
  const title = String(
    doc.getMap("meta").get("title") ?? "Untitled manuscript",
  );
  const matches = editor ? findMatches(editor, find) : [];
  const notifyError = (e: unknown) =>
    setMessage(
      e instanceof Error ? e.message : "The operation could not be completed.",
    );
  async function insertImage(file: File) {
    if (!editor) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("Choose a PNG, JPEG, or WebP image up to 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      editor
        .chain()
        .focus()
        .setImage({ src: String(reader.result), alt: file.name })
        .run();
      setPanel(null);
    };
    reader.onerror = () => setMessage("Image could not be read.");
    reader.readAsDataURL(file);
  }
  async function exportDocx() {
    if (!editor) return;
    setExporting(true);
    try {
      const { exportManuscriptDocx } = await import("./docx-export");
      await exportManuscriptDocx(
        editor.getJSON(),
        format,
        sources,
        style,
        title,
      );
      setMessage(
        "DOCX exported. Review pagination in your word processor; line wrapping can differ.",
      );
    } catch (e) {
      notifyError(e);
    } finally {
      setExporting(false);
    }
  }
  async function importDocx(file: File) {
    if (!editor) return;
    setExporting(true);
    try {
      const { importManuscriptDocx } = await import("./docx-export");
      const result = await importManuscriptDocx(file);
      editor.chain().focus("end").insertContent(result.html).run();
      setMessage(`Imported at the end of the manuscript. ${result.warnings}`);
    } catch (e) {
      notifyError(e);
    } finally {
      setExporting(false);
    }
  }
  function insertBlock() {
    if (!editor) return;
    const text = insertText.trim();
    if (!text) return;
    if (insertKind === "section")
      editor
        .chain()
        .focus()
        .insertContent([
          {
            type: "heading",
            attrs: {
              level: 1,
              id: `section-${crypto.randomUUID()}`,
              section: "main",
            },
            content: [{ type: "text", text }],
          },
          { type: "paragraph" },
        ])
        .run();
    if (insertKind === "figure" || insertKind === "table")
      editor
        .chain()
        .focus()
        .insertContent({
          type: "caption",
          attrs: { id: `caption-${crypto.randomUUID()}`, kind: insertKind },
          content: [{ type: "text", text }],
        })
        .run();
    if (insertKind === "footnote")
      editor
        .chain()
        .focus()
        .insertContent({
          type: "footnote",
          attrs: { id: `footnote-${crypto.randomUUID()}`, text },
        })
        .run();
    if (insertKind === "link") {
      if (!/^https?:\/\//i.test(text)) {
        setMessage("Use an https:// or http:// link.");
        return;
      }
      editor.chain().focus().setLink({ href: text }).run();
    }
    setInsertText("");
    setPanel(null);
  }
  if (!editor) return <div role="status">Opening editor…</div>;
  return (
    <div className={`writing-studio ${demo ? "pages-demo" : ""}`}>
      <header className="pages-studio-header">
        <Link to={demo ? "/" : "/pages"} aria-label="Back to Pages">
          <BrandMark />
        </Link>
        <div className="pages-title-block">
          <span className="pages-eyebrow">
            PAGES {demo ? " / PLAYGROUND" : ""}
          </span>
          <input
            aria-label="Manuscript title"
            value={title}
            maxLength={120}
            readOnly={!writable || demo}
            onChange={(e) => doc.getMap("meta").set("title", e.target.value)}
          />
        </div>
        <span className="pages-save-status" role="status">
          {demo ? "Temporary · not saved or shared" : status}
        </span>
        {!demo && (
          <>
            <button type="button" onClick={() => setPanel("collaboration")}>
              <UsersIcon weight="fill" />
              <span>Share</span>
            </button>
            <details className="pages-export">
              <summary>Export</summary>
              <div>
                <button onClick={() => setPrinting(true)}>
                  <PrinterIcon />
                  Print / Save PDF
                </button>
                <button disabled={exporting} onClick={() => void exportDocx()}>
                  <FileTextIcon />
                  Download DOCX
                </button>
                <button
                  onClick={() =>
                    downloadBlob(
                      new Blob(
                        [
                          JSON.stringify({
                            version: 1,
                            title,
                            update: encodeUpdate(encodeStateAsUpdate(doc)),
                          }),
                        ],
                        { type: "application/json" },
                      ),
                      `${title}.pages.json`,
                    )
                  }
                >
                  Recovery copy (.json)
                </button>
              </div>
            </details>
          </>
        )}
      </header>
      <div
        className="pages-format-toolbar"
        role="toolbar"
        aria-label="Text formatting"
      >
        <button
          aria-label="Toggle chapter navigator"
          aria-pressed={outlineOpen}
          onClick={() => setOutlineOpen(!outlineOpen)}
        >
          <ListIcon />
        </button>
        <span className="pages-divider" />
        <button
          aria-label="Undo"
          disabled={!writable || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <ArrowUUpLeftIcon />
        </button>
        <button
          aria-label="Redo"
          disabled={!writable || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <ArrowUUpRightIcon />
        </button>
        <select
          aria-label="Paragraph style"
          disabled={!writable}
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : "0"
          }
          onChange={(e) => {
            const level = Number(e.target.value);
            if (level)
              editor
                .chain()
                .focus()
                .setHeading({ level: level as 1 | 2 | 3 })
                .run();
            else editor.chain().focus().setParagraph().run();
          }}
        >
          <option value="0">Body text</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>
        <button
          aria-label="Bold"
          aria-pressed={editor.isActive("bold")}
          disabled={!writable}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <b>B</b>
        </button>
        <button
          aria-label="Italic"
          aria-pressed={editor.isActive("italic")}
          disabled={!writable}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <i>I</i>
        </button>
        <button
          aria-label="Underline"
          aria-pressed={editor.isActive("underline")}
          disabled={!writable}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </button>
        <select
          aria-label="Text alignment"
          disabled={!writable}
          value={
            ["left", "center", "right", "justify"].find((a) =>
              editor.isActive({ textAlign: a }),
            ) ?? "left"
          }
          onChange={(e) =>
            editor.chain().focus().setTextAlign(e.target.value).run()
          }
        >
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
        <button
          aria-label="Bullet list"
          aria-pressed={editor.isActive("bulletList")}
          disabled={!writable}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </button>
        <button
          aria-label="Numbered list"
          disabled={!writable}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        {!demo && (
          <>
            <button
              aria-label="Find and replace"
              onClick={() => setPanel("find")}
            >
              <MagnifyingGlassIcon />
            </button>
            <button
              aria-label="Document formatting"
              onClick={() => setPanel("format")}
            >
              <SlidersHorizontalIcon />
            </button>
          </>
        )}
      </div>
      {message && (
        <div className="pages-notice" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      <div className="pages-studio-body">
        {outlineOpen && (
          <aside className="pages-outline" aria-label="Chapter navigator">
            <p className="pages-eyebrow">YOUR MANUSCRIPT</p>
            <h2>A little structure.</h2>
            <p>
              {outline.filter((n) => n.level === 1).length} sections ·{" "}
              {editor.state.doc.textContent
                .split(/\s+/)
                .filter(Boolean)
                .length.toLocaleString()}{" "}
              words
            </p>
            <nav>
              {outline
                .filter((n) => !n.kind)
                .map((n) => (
                  <button
                    key={n.id}
                    style={{ paddingLeft: 12 + (n.level - 1) * 12 }}
                    onClick={() => {
                      editor
                        .chain()
                        .focus()
                        .setTextSelection(n.position + 1)
                        .scrollIntoView()
                        .run();
                    }}
                  >
                    {n.level === 1 && <span className="pages-outline-dot" />}
                    {n.title || "Untitled heading"}
                  </button>
                ))}
            </nav>
            {writable && !demo && (
              <button
                className="pages-add-section"
                onClick={() => {
                  setInsertKind("section");
                  setPanel("insert");
                }}
              >
                + Add section
              </button>
            )}
            <small>
              Section headings are editable. Drag-select text to move it with
              cut and paste.
            </small>
          </aside>
        )}
        <main className="pages-paper-scroll">
          <div className="pages-writing-label">
            <span>
              {demo ? "Try a chapter. Make it yours." : "WRITING VIEW"}
            </span>
            {!demo && (
              <button onClick={() => setPrinting(true)}>
                Check print layout <PrinterIcon />
              </button>
            )}
          </div>
          <div
            className="pages-paper"
            style={
              {
                "--paper-width": `${dimensions.width}mm`,
                "--paper-height": `${dimensions.height}mm`,
                "--margin-top": `${format.top}mm`,
                "--margin-right": `${format.right}mm`,
                "--margin-bottom": `${format.bottom}mm`,
                "--margin-left": `${format.left}mm`,
                "--manuscript-font": format.font,
                "--manuscript-size": `${format.fontSize}pt`,
                "--manuscript-leading": format.lineHeight,
                "--paragraph-space": `${format.paragraphSpacing}pt`,
                "--paragraph-indent": `${format.indent}mm`,
              } as CSSProperties
            }
          >
            <EditorContent editor={editor} />
          </div>
          <p className="pages-writing-note">
            {demo
              ? "Demo changes disappear when you leave."
              : "Continuous editing · Print layout calculates page breaks, running headers, and page numbers."}
          </p>
        </main>
      </div>
      {!demo && (
        <nav className="pages-creative-dock" aria-label="Manuscript tools">
          <button onClick={() => setPanel("references")}>
            <BookOpenIcon weight="fill" />
            References
          </button>
          <button
            disabled={!writable}
            onClick={() => {
              setInsertKind("figure");
              setPanel("insert");
            }}
          >
            <ImageIcon weight="fill" />
            Insert
          </button>
          <button
            disabled={!writable}
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
          >
            <TableIcon weight="fill" />
            Table
          </button>
          <button onClick={() => setPanel("history")}>
            <ClockCounterClockwiseIcon weight="fill" />
            History
          </button>
        </nav>
      )}
      {panel && (
        <AccessibleDialog
          title={
            {
              format: "Make it fit your institution",
              references: "Your sources, in one place",
              find: "Find and replace",
              insert: "Add to your manuscript",
              history: "Revision history",
              collaboration: "People and comments",
            }[panel]
          }
          description="Changes apply to this manuscript."
          panelClassName="max-w-2xl pages-dialog"
          onClose={() => setPanel(null)}
        >
          {panel === "format" && (
            <FormatPanel doc={doc} editor={editor} writable={writable} />
          )}
          {panel === "references" && (
            <Suspense fallback={<p role="status">Loading reference tools…</p>}>
              <ReferencePanel doc={doc} editor={editor} writable={writable} />
            </Suspense>
          )}
          {panel === "find" && (
            <div className="pages-form">
              <label>
                Find
                <input value={find} onChange={(e) => setFind(e.target.value)} />
              </label>
              <p>{matches.length} matches</p>
              <button
                disabled={!matches.length}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .setTextSelection(
                      matches.find(
                        (m) => m.from > editor.state.selection.from,
                      ) ?? matches[0]!,
                    )
                    .scrollIntoView()
                    .run();
                  setPanel(null);
                }}
              >
                Go to next match
              </button>
              <label>
                Replace with
                <input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                />
              </label>
              <button
                disabled={!writable || !matches.length}
                onClick={() => {
                  const tr = editor.state.tr;
                  for (const m of [...matches].reverse())
                    tr.insertText(replacement, m.from, m.to);
                  editor.view.dispatch(tr);
                  setMessage(`Replaced ${matches.length} matches.`);
                }}
              >
                Replace all
              </button>
            </div>
          )}
          {panel === "insert" && (
            <div className="pages-form">
              <label>
                Insert
                <select
                  value={insertKind}
                  onChange={(e) => setInsertKind(e.target.value)}
                >
                  <option value="section">Main section</option>
                  <option value="figure">Figure caption</option>
                  <option value="table">Table caption</option>
                  <option value="footnote">Footnote</option>
                  <option value="link">Link on selected text</option>
                </select>
              </label>
              <label>
                {insertKind === "link" ? "URL" : "Text"}
                <textarea
                  value={insertText}
                  onChange={(e) => setInsertText(e.target.value)}
                />
              </label>
              <button disabled={!insertText.trim()} onClick={insertBlock}>
                Insert at cursor
              </button>
              <label>
                Image or exported Whiteboard diagram
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void insertImage(file);
                  }}
                />
              </label>
              <p>
                Export a Whiteboard as PNG, then insert it here at its original
                resolution. Charts, diagrams, shapes, and illustrations can be
                composed there.
              </p>
              <div className="pages-button-row">
                <button
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertContent({ type: "pageBreak" })
                      .run();
                    setPanel(null);
                  }}
                >
                  Page break
                </button>
                <button
                  onClick={() => {
                    editor.chain().focus().toggleBlockquote().run();
                    setPanel(null);
                  }}
                >
                  Callout block
                </button>
                <button
                  onClick={() => {
                    editor
                      .chain()
                      .focus()
                      .insertContent({
                        type: "generatedIndex",
                        attrs: { kind: "toc" },
                      })
                      .run();
                    setPanel(null);
                  }}
                >
                  Table of contents
                </button>
              </div>
              <label>
                Cross-reference
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="">Select a heading or caption</option>
                  {outline.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                disabled={!target}
                onClick={() => {
                  editor
                    .chain()
                    .focus()
                    .insertContent({
                      type: "crossReference",
                      attrs: {
                        target,
                        label:
                          outline.find((n) => n.id === target)?.title ??
                          "Reference",
                      },
                    })
                    .run();
                  setPanel(null);
                }}
              >
                Insert cross-reference
              </button>
              {editor.isActive("table") && (
                <div className="pages-button-row">
                  <button
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                  >
                    Add row
                  </button>
                  <button
                    onClick={() =>
                      editor.chain().focus().addColumnAfter().run()
                    }
                  >
                    Add column
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteRow().run()}
                  >
                    Delete row
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                  >
                    Delete column
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteTable().run()}
                  >
                    Delete table
                  </button>
                </div>
              )}
              <label>
                Import DOCX (appends content)
                <input
                  disabled={exporting}
                  type="file"
                  accept=".docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void importDocx(file);
                  }}
                />
              </label>
              <small>
                Import preserves basic structure. Review styles, citations,
                headers, and pagination after import.
              </small>
            </div>
          )}
          {panel === "history" && (
            <RevisionPanel
              doc={doc}
              editor={editor}
              writable={writable}
              documentId={documentId}
              userId={userId}
              local={local}
            />
          )}
          {panel === "collaboration" && (
            <CollaborationPanel
              documentId={documentId}
              userId={userId}
              role={role}
              local={local}
              selection={editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                " ",
              )}
            />
          )}
        </AccessibleDialog>
      )}
      {printing && (
        <Suspense
          fallback={
            <p className="pages-notice" role="status">
              Loading print layout…
            </p>
          }
        >
          <PrintLayout
            editor={editor}
            format={format}
            sources={sources}
            style={style}
            title={title}
            onClose={() => setPrinting(false)}
          />
        </Suspense>
      )}
    </div>
  );
}

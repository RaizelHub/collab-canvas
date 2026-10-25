import { useState } from "react";
import type * as Y from "yjs";
import type { Editor } from "@tiptap/core";
import { DEFAULT_FORMAT, validateFormat, type PaperFormat } from "./model";
import { readFormat } from "./document-state";
export function FormatPanel({
  doc,
  editor,
  writable,
}: {
  doc: Y.Doc;
  editor: Editor;
  writable: boolean;
}) {
  const [draft, setDraft] = useState(readFormat(doc));
  const [message, setMessage] = useState("");
  const set = <K extends keyof PaperFormat>(key: K, value: PaperFormat[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  return (
    <form
      className="pages-form"
      onSubmit={(e) => {
        e.preventDefault();
        const error = validateFormat(draft);
        if (error) {
          setMessage(error);
          return;
        }
        doc.transact(() => {
          for (const [k, v] of Object.entries(draft))
            doc.getMap("format").set(k, v);
        });
        setMessage(
          "Document formatting applied. Regenerate Print layout to check pagination.",
        );
      }}
    >
      <fieldset disabled={!writable}>
        <label>
          Starting preset
          <select
            defaultValue="custom"
            onChange={(e) => {
              if (e.target.value === "double") setDraft({ ...DEFAULT_FORMAT });
              if (e.target.value === "compact")
                setDraft({
                  ...DEFAULT_FORMAT,
                  font: "Arial",
                  lineHeight: 1.15,
                  paragraphSpacing: 8,
                });
            }}
          >
            <option value="custom">Current document</option>
            <option value="double">Academic · double-spaced</option>
            <option value="compact">Report · compact</option>
          </select>
        </label>
        <div className="pages-field-grid">
          <label>
            Paper
            <select
              value={draft.size}
              onChange={(e) =>
                set("size", e.target.value as PaperFormat["size"])
              }
            >
              <option>A4</option>
              <option>Letter</option>
              <option>Custom</option>
            </select>
          </label>
          <label>
            Orientation
            <select
              value={draft.orientation}
              onChange={(e) =>
                set("orientation", e.target.value as PaperFormat["orientation"])
              }
            >
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </label>
          {(draft.size === "Custom"
            ? ["width", "height", "top", "bottom", "left", "right"]
            : ["top", "bottom", "left", "right"]
          ).map((key) => (
            <label key={key}>
              {key} (mm)
              <input
                type="number"
                step="0.1"
                value={draft[key as keyof PaperFormat] as number}
                onChange={(e) =>
                  set(key as keyof PaperFormat, Number(e.target.value))
                }
              />
            </label>
          ))}
          <label>
            Body font
            <select
              value={draft.font}
              onChange={(e) => set("font", e.target.value)}
            >
              {[
                "Times New Roman",
                "Georgia",
                "Arial",
                "Calibri",
                "Verdana",
              ].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          {(
            ["fontSize", "lineHeight", "paragraphSpacing", "indent"] as const
          ).map((key) => (
            <label key={key}>
              {
                {
                  fontSize: "Font size (pt)",
                  lineHeight: "Line spacing",
                  paragraphSpacing: "After paragraph (pt)",
                  indent: "First line / hanging indent (mm)",
                }[key]
              }
              <input
                type="number"
                step="0.1"
                value={draft[key]}
                onChange={(e) => set(key, Number(e.target.value))}
              />
            </label>
          ))}
        </div>
        <p>
          Use a negative indent for hanging paragraphs. Body settings apply
          throughout; selected text can override font and size.
        </p>
        <label>
          Header
          <input
            maxLength={120}
            value={draft.header}
            onChange={(e) => set("header", e.target.value)}
          />
        </label>
        <label>
          Footer
          <input
            maxLength={120}
            value={draft.footer}
            onChange={(e) => set("footer", e.target.value)}
          />
        </label>
        <label className="pages-check">
          <input
            type="checkbox"
            checked={draft.numbering}
            onChange={(e) => set("numbering", e.target.checked)}
          />
          Number pages (Roman preliminary, Arabic main)
        </label>
        <button type="submit">Apply document formatting</button>
        <hr />
        <h3>Selected text</h3>
        <div className="pages-button-row">
          <button
            type="button"
            onClick={() =>
              editor
                .chain()
                .focus()
                .setFontFamily(draft.font)
                .setFontSize(`${draft.fontSize}pt`)
                .run()
            }
          >
            Apply font and size to selection
          </button>
          <button
            type="button"
            onClick={() =>
              editor.chain().focus().unsetFontFamily().unsetFontSize().run()
            }
          >
            Use body style
          </button>
        </div>
        <label>
          Current heading starts a section
          <select
            value={editor.getAttributes("heading").section ?? ""}
            disabled={!editor.isActive("heading")}
            onChange={(e) =>
              editor
                .chain()
                .focus()
                .updateAttributes("heading", {
                  section: e.target.value || null,
                })
                .run()
            }
          >
            <option value="">No section break</option>
            <option value="preliminary">Preliminary (Roman)</option>
            <option value="main">Main (Arabic)</option>
          </select>
        </label>
      </fieldset>
      {message && <p role="status">{message}</p>}
    </form>
  );
}

import { getSchema } from "@tiptap/core";
import { yDocToProsemirrorJSON } from "@tiptap/y-tiptap";
import type * as Y from "yjs";
import { academicExtensions } from "./extensions";
import { DEFAULT_FORMAT, validateFormat, type ReferenceSource } from "./model";
const fields = [
  "id",
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
] as const;
export function validSource(value: unknown): value is ReferenceSource {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return (
    fields.every((k) => typeof source[k] === "string") &&
    ["book", "article-journal", "webpage", "report"].includes(
      String(source.type),
    )
  );
}
export function validateRecovery(doc: Y.Doc) {
  const schema = getSchema(academicExtensions());
  schema.nodeFromJSON(yDocToProsemirrorJSON(doc, "content")).check();
  const format = { ...DEFAULT_FORMAT, ...doc.getMap("format").toJSON() };
  if (validateFormat(format))
    throw new Error("Recovery file contains invalid paper settings.");
  if (
    Array.from(doc.getMap("references").values()).some(
      (source) => !validSource(source),
    )
  )
    throw new Error("Recovery file contains invalid reference metadata.");
  for (const snapshot of doc.getMap("revisions").values()) {
    if (!snapshot || typeof snapshot !== "object")
      throw new Error("Invalid recovery checkpoint.");
    const r = snapshot as Record<string, unknown>;
    if (
      typeof r.id !== "string" ||
      typeof r.label !== "string" ||
      typeof r.created_at !== "string" ||
      !r.content ||
      !r.format ||
      !Array.isArray(r.references) ||
      r.references.some((source) => !validSource(source)) ||
      !["apa", "ieee", "mla"].includes(String(r.style))
    )
      throw new Error("Invalid recovery checkpoint.");
    schema.nodeFromJSON(r.content).check();
  }
}

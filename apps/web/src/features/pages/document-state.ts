import * as Y from "yjs";
import { getSchema } from "@tiptap/core";
import { prosemirrorJSONToYDoc } from "@tiptap/y-tiptap";
import { academicExtensions } from "./extensions";
import {
  DEFAULT_FORMAT,
  validateFormat,
  type CitationStyle,
  type PaperFormat,
  type ReferenceSource,
} from "./model";
import { templateContent } from "./templates";
export function encodeUpdate(update: Uint8Array): string {
  let binary = "";
  for (const byte of update) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodeUpdate(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
export function createManuscript(template: string, title: string): Y.Doc {
  const doc = prosemirrorJSONToYDoc(
    getSchema(academicExtensions(true)),
    templateContent(template),
    "content",
  );
  doc.transact(() => {
    doc.getMap("meta").set("title", title);
    doc.getMap("meta").set("style", "apa");
    for (const [key, value] of Object.entries(DEFAULT_FORMAT))
      doc.getMap("format").set(key, value);
  });
  return doc;
}
export function readFormat(doc: Y.Doc): PaperFormat {
  const format = { ...DEFAULT_FORMAT, ...doc.getMap("format").toJSON() };
  return validateFormat(format) ? { ...DEFAULT_FORMAT } : format;
}
export function readSources(doc: Y.Doc): ReferenceSource[] {
  return Array.from(doc.getMap<ReferenceSource>("references").values());
}
export function readStyle(doc: Y.Doc): CitationStyle {
  const value = doc.getMap("meta").get("style");
  return value === "ieee" || value === "mla" ? value : "apa";
}

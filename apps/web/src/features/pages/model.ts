import type { JSONContent } from "@tiptap/core";

export type DocumentRole = "owner" | "editor" | "commenter" | "viewer";
export type CitationStyle = "apa" | "ieee" | "mla";
export interface PaperFormat {
  size: "A4" | "Letter" | "Custom";
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  top: number;
  bottom: number;
  left: number;
  right: number;
  font: string;
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  indent: number;
  header: string;
  footer: string;
  numbering: boolean;
}
export const DEFAULT_FORMAT: PaperFormat = {
  size: "A4",
  width: 210,
  height: 297,
  orientation: "portrait",
  top: 25.4,
  bottom: 25.4,
  left: 25.4,
  right: 25.4,
  font: "Times New Roman",
  fontSize: 12,
  lineHeight: 2,
  paragraphSpacing: 6,
  indent: 0,
  header: "",
  footer: "",
  numbering: true,
};
export interface ReferenceSource {
  id: string;
  type: "book" | "article-journal" | "webpage" | "report";
  title: string;
  authors: string;
  year: string;
  publisher: string;
  journal: string;
  volume: string;
  issue: string;
  pages: string;
  doi: string;
  url: string;
}
export interface Manuscript {
  id: string;
  title: string;
  owner_id: string;
  template: string;
  initial_state: string;
  created_at: string;
}
export interface Revision {
  id: string;
  label: string;
  created_at: string;
  content: JSONContent;
  format: PaperFormat;
  references: ReferenceSource[];
  style: CitationStyle;
}
export const canWrite = (role: DocumentRole) =>
  role === "owner" || role === "editor";
export const canComment = (role: DocumentRole) => role !== "viewer";
export function paperDimensions(format: PaperFormat) {
  const [width, height] =
    format.size === "A4"
      ? [210, 297]
      : format.size === "Letter"
        ? [215.9, 279.4]
        : [format.width, format.height];
  return format.orientation === "landscape"
    ? { width: Math.max(width, height), height: Math.min(width, height) }
    : { width: Math.min(width, height), height: Math.max(width, height) };
}
export function validateFormat(format: PaperFormat): string | null {
  if (
    !["A4", "Letter", "Custom"].includes(format.size) ||
    !["portrait", "landscape"].includes(format.orientation) ||
    !["Times New Roman", "Georgia", "Arial", "Calibri", "Verdana"].includes(
      format.font,
    ) ||
    typeof format.header !== "string" ||
    typeof format.footer !== "string" ||
    typeof format.numbering !== "boolean"
  )
    return "Invalid paper formatting settings.";
  const { width, height } = paperDimensions(format);
  if (
    ![
      width,
      height,
      format.top,
      format.bottom,
      format.left,
      format.right,
      format.fontSize,
      format.lineHeight,
      format.paragraphSpacing,
      format.indent,
    ].every(Number.isFinite)
  )
    return "Use valid numbers for formatting.";
  if (width < 100 || height < 100 || width > 600 || height > 600)
    return "Paper dimensions must be between 100 and 600 mm.";
  if (
    Math.min(format.top, format.bottom, format.left, format.right) < 5 ||
    format.left + format.right > width - 40 ||
    format.top + format.bottom > height - 40
  )
    return "Leave at least 40 mm of writing space and 5 mm margins.";
  if (
    format.fontSize < 8 ||
    format.fontSize > 36 ||
    format.lineHeight < 1 ||
    format.lineHeight > 3 ||
    Math.abs(format.indent) > 30 ||
    format.paragraphSpacing < 0 ||
    format.paragraphSpacing > 40
  )
    return "Check font size, spacing, and indentation ranges.";
  return null;
}

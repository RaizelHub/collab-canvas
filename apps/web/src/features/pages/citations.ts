import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import ieee from "./csl/ieee.csl?raw";
import mla from "./csl/modern-language-association.csl?raw";
import type { CitationStyle, ReferenceSource } from "./model";
const config = plugins.config.get("@csl");
config.styles.add("ieee", ieee);
config.styles.add("mla", mla);
export function missingFields(source: ReferenceSource) {
  return [
    !source.title && "title",
    !source.authors && "author",
    !source.year && "year",
    source.type === "article-journal" && !source.journal && "journal",
    source.type === "book" && !source.publisher && "publisher",
    source.type === "webpage" && !source.url && "URL",
  ].filter(Boolean) as string[];
}
export function toCsl(source: ReferenceSource) {
  return {
    id: source.id,
    type: source.type,
    title: source.title,
    author: source.authors
      .split(";")
      .map((a) => a.trim())
      .filter(Boolean)
      .map((a) => {
        const [family, given] = a.split(",").map((n) => n.trim());
        return given ? { family, given } : { literal: family };
      }),
    ...(source.year && /^\d{4}$/.test(source.year)
      ? { issued: { "date-parts": [[Number(source.year)]] } }
      : {}),
    publisher: source.publisher,
    "container-title": source.journal,
    volume: source.volume,
    issue: source.issue,
    page: source.pages,
    DOI: source.doi,
    URL: source.url,
  };
}
export function citationLabels(
  sources: ReferenceSource[],
  style: CitationStyle,
  order: string[],
): Map<string, string> {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const unique = [...new Set(order)].filter((id) => byId.has(id));
  if (!unique.length) return new Map();
  const cite = new Cite(unique.map((id) => toCsl(byId.get(id)!)));
  return new Map(
    unique.map((id, index) => [
      id,
      cite.format("citation", {
        template: style,
        format: "text",
        lang: "en-US",
        entry: [id],
        citationsPre: unique.slice(0, index).map((previous) => [previous]),
      }),
    ]),
  );
}
export function bibliography(
  sources: ReferenceSource[],
  style: CitationStyle,
  order: string[],
  format: "html" | "text" = "html",
): string {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const ordered = [...new Set([...order, ...sources.map((s) => s.id)])].flatMap(
    (id) => (byId.has(id) ? [toCsl(byId.get(id)!)] : []),
  );
  return ordered.length
    ? new Cite(ordered).format("bibliography", {
        template: style,
        format,
        lang: "en-US",
      })
    : "No sources added. Add and verify your own references.";
}

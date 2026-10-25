import DOMPurify from "dompurify";
import type { CitationStyle, ReferenceSource, PaperFormat } from "./model";
import { paperDimensions } from "./model";
import { bibliography, citationLabels } from "./citations";
export function materializeHtml(
  html: string,
  sources: ReferenceSource[],
  style: CitationStyle,
): string {
  const root = document.createElement("div");
  root.innerHTML = DOMPurify.sanitize(html);
  // Tiptap represents header cells inside tbody; semantic thead enables
  // repeating column headings when Paged.js splits a table across pages.
  for (const table of root.querySelectorAll("table")) {
    if (table.querySelector("thead")) continue;
    const headingRows = [];
    for (const row of Array.from(table.rows)) {
      if (
        !row.cells.length ||
        !Array.from(row.cells).every((cell) => cell.tagName === "TH")
      )
        break;
      headingRows.push(row);
    }
    if (headingRows.length) {
      const head = document.createElement("thead");
      head.append(...headingRows);
      table.prepend(head);
    }
  }
  const order = Array.from(root.querySelectorAll("[data-citation]")).map(
    (n) => n.getAttribute("data-citation")!,
  );
  const labels = citationLabels(sources, style, order);
  root.querySelectorAll("[data-citation]").forEach((n) => {
    n.textContent =
      labels.get(n.getAttribute("data-citation")!) ??
      "[Missing source — verify reference]";
  });
  const counters = { figure: 0, table: 0 };
  root.querySelectorAll<HTMLElement>("[data-caption]").forEach((n) => {
    const kind = n.dataset.caption === "table" ? "table" : "figure";
    n.textContent = `${kind === "table" ? "Table" : "Figure"} ${++counters[kind]}. ${n.textContent}`;
  });
  root.querySelectorAll<HTMLElement>("[data-cross-reference]").forEach((n) => {
    const target = Array.from(root.querySelectorAll("[id]")).find(
      (t) => t.id === n.dataset.crossReference,
    );
    n.textContent = target?.textContent ?? "[Missing cross-reference]";
  });
  root.querySelectorAll<HTMLElement>("[data-generated]").forEach((n) => {
    const kind = n.dataset.generated;
    n.replaceChildren();
    if (kind === "bibliography") {
      n.innerHTML = DOMPurify.sanitize(bibliography(sources, style, order));
      return;
    }
    const selector =
      kind === "toc"
        ? "h1[id],h2[id],h3[id]"
        : kind === "tables"
          ? "[data-caption=table]"
          : "[data-caption=figure]";
    for (const entry of root.querySelectorAll<HTMLElement>(selector)) {
      if (entry.nextElementSibling === n) continue;
      const row = document.createElement("p");
      row.className = "index-row";
      const link = document.createElement("a");
      link.href = `#${entry.id}`;
      link.textContent = entry.textContent;
      const number = document.createElement("span");
      number.dataset.tocTarget = entry.id;
      number.textContent = "—";
      row.append(link, number);
      n.append(row);
    }
    if (!n.childNodes.length) n.textContent = "No entries yet.";
  });
  const result = document.createElement("div");
  let section = document.createElement("section");
  section.dataset.numbering =
    root.querySelector("h1")?.getAttribute("data-section") === "preliminary"
      ? "preliminary"
      : "main";
  result.append(section);
  for (const child of Array.from(root.children)) {
    const numbering = child.getAttribute("data-section");
    if (numbering && numbering !== section.dataset.numbering) {
      section = document.createElement("section");
      section.dataset.numbering = numbering;
      result.append(section);
    }
    section.append(child);
  }
  return result.innerHTML;
}
export function printCss(format: PaperFormat): string {
  const { width, height } = paperDimensions(format);
  const quote = (text: string) => JSON.stringify(text).replace(/</g, "\\3c ");
  return `@page {size:${width}mm ${height}mm;margin:${format.top}mm ${format.right}mm ${format.bottom}mm ${format.left}mm;@top-center{content:${quote(format.header)};font:9pt Arial;color:#666}@bottom-left{content:${quote(format.footer)};font:9pt Arial;color:#666}@bottom-center{content:' ';font:10pt Arial}}
  body{font-family:${quote(format.font)},serif;font-size:${format.fontSize}pt;line-height:${format.lineHeight};color:#20222a}p{margin:0 0 ${format.paragraphSpacing}pt;text-indent:${format.indent}mm;orphans:3;widows:3}h1,h2,h3{break-after:avoid;line-height:1.3;margin:1em 0 .7em}h1{font-size:1.65em}h2{font-size:1.3em}h3{font-size:1.15em}h1[data-section]{break-before:page}section>h1:first-child{margin-top:0}section[data-numbering]{break-before:page}img{max-width:100%;height:auto;break-inside:avoid}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #999;padding:6px;overflow-wrap:anywhere}th{background:#f3f1f7}thead{display:table-header-group}tr{break-inside:avoid}blockquote{border-left:3px solid #b9a6e1;padding:10px 16px}a{color:inherit;text-decoration:none}[data-page-break]{break-before:page;height:0;font-size:0;color:transparent}[data-caption]{font-style:italic;text-align:center;font-size:.9em;break-before:avoid}[data-footnote]{float:footnote;font-size:9pt;line-height:1.3}::footnote-call{content:counter(footnote);vertical-align:super;font-size:.7em}::footnote-marker{content:counter(footnote)'. '}.index-row{display:flex;justify-content:space-between;gap:20px;text-indent:0;margin:0 0 8px;font-size:11pt}.index-row span{min-width:30px;text-align:right}.csl-entry{text-indent:-12mm;margin-left:12mm;margin-bottom:8pt}[data-generated]{margin-bottom:1em}
  @media screen{body{background:#ededf1;margin:0}.pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:20px;padding:24px}.pagedjs_page{background:white;box-shadow:0 2px 12px #0001;flex-shrink:0}}
  @media print{body{margin:0}.pagedjs_pages{padding:0}.pagedjs_page{box-shadow:none;margin:0;break-after:page}}
  `;
}

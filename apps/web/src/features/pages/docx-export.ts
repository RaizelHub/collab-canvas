import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  ImageRun,
  ExternalHyperlink,
  FootnoteReferenceRun,
  TableOfContents,
  Bookmark,
  InternalHyperlink,
  SectionType,
  WidthType,
  type ParagraphChild,
  type ISectionOptions,
} from "docx";
import type { JSONContent } from "@tiptap/core";
import DOMPurify from "dompurify";
import {
  paperDimensions,
  type PaperFormat,
  type ReferenceSource,
  type CitationStyle,
} from "./model";
import { citationLabels, bibliography } from "./citations";
import { textOf } from "./editor-utils";
import { downloadBlob } from "./download";
const twips = (mm: number) => Math.round((mm * 1440) / 25.4);
function bibliographyRuns(
  node: globalThis.Node,
  italics = false,
  bold = false,
): TextRun[] {
  if (node.nodeType === 3)
    return [new TextRun({ text: node.textContent ?? "", italics, bold })];
  const el = node as HTMLElement;
  const runs = Array.from(node.childNodes).flatMap((child) =>
    bibliographyRuns(
      child,
      italics ||
        el.tagName === "I" ||
        el.tagName === "EM" ||
        el.style?.fontStyle === "italic",
      bold ||
        el.tagName === "B" ||
        el.tagName === "STRONG" ||
        el.style?.fontWeight === "bold",
    ),
  );
  if (el.classList?.contains("csl-left-margin")) runs.push(new TextRun(" "));
  return runs;
}
export async function buildDocx(
  content: JSONContent,
  format: PaperFormat,
  sources: ReferenceSource[],
  style: CitationStyle,
  title: string,
): Promise<Blob> {
  const all: JSONContent[] = [];
  const walk = (n: JSONContent) => {
    all.push(n);
    n.content?.forEach(walk);
  };
  walk(content);
  const order = all
    .filter((n) => n.type === "citation")
    .map((n) => String(n.attrs?.sourceId));
  const labels = citationLabels(sources, style, order);
  const captions = new Map<JSONContent, string>();
  const counts = { figure: 0, table: 0 };
  all
    .filter((n) => n.type === "caption")
    .forEach((n) => {
      const kind = n.attrs?.kind === "table" ? "table" : "figure";
      captions.set(
        n,
        `${kind === "table" ? "Table" : "Figure"} ${++counts[kind]}. ${textOf(n)}`,
      );
    });
  const footnotes: Record<string, { children: Paragraph[] }> = {};
  let footnoteId = 0;
  const anchors = new Map(
    all
      .filter((n) => n.attrs?.id)
      .map((n) => [
        n.attrs!.id,
        `a${String(n.attrs!.id)
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 35)}`,
      ]),
  );
  function inline(nodes: JSONContent[] = []): ParagraphChild[] {
    return nodes.flatMap((n): ParagraphChild[] => {
      if (n.type === "hardBreak") return [new TextRun({ break: 1 })];
      if (n.type === "footnote") {
        const id = ++footnoteId;
        footnotes[id] = {
          children: [new Paragraph(String(n.attrs?.text ?? ""))],
        };
        return [new FootnoteReferenceRun(id)];
      }
      if (n.type === "citation")
        return [
          new TextRun(
            labels.get(String(n.attrs?.sourceId)) ?? "[Missing source]",
          ),
        ];
      if (n.type === "crossReference") {
        const target = all.find((a) => a.attrs?.id === n.attrs?.target);
        const text = target
          ? (captions.get(target) ?? textOf(target))
          : "[Missing cross-reference]";
        const anchor = anchors.get(n.attrs?.target);
        return anchor
          ? [new InternalHyperlink({ anchor, children: [new TextRun(text)] })]
          : [new TextRun(text)];
      }
      const marks = n.marks ?? [];
      const textStyle = marks.find((m) => m.type === "textStyle")?.attrs;
      const run = new TextRun({
        text: n.text ?? textOf(n),
        bold: marks.some((m) => m.type === "bold"),
        italics: marks.some((m) => m.type === "italic"),
        underline: marks.some((m) => m.type === "underline") ? {} : undefined,
        strike: marks.some((m) => m.type === "strike"),
        font: textStyle?.fontFamily,
        size: textStyle?.fontSize
          ? parseFloat(textStyle.fontSize) * 2
          : undefined,
      });
      const href = marks.find((m) => m.type === "link")?.attrs?.href;
      return href && /^https?:\/\//i.test(href)
        ? [new ExternalHyperlink({ link: href, children: [run] })]
        : [run];
    });
  }
  const align = (value: unknown) =>
    ({
      left: AlignmentType.LEFT,
      center: AlignmentType.CENTER,
      right: AlignmentType.RIGHT,
      justify: AlignmentType.JUSTIFIED,
    })[String(value)] ?? AlignmentType.LEFT;
  async function blocks(
    nodes: JSONContent[],
    level = 0,
    list?: "bullet" | "ordered",
  ): Promise<(Paragraph | Table | TableOfContents)[]> {
    const result: (Paragraph | Table | TableOfContents)[] = [];
    for (const n of nodes) {
      if (n.type === "bulletList" || n.type === "orderedList") {
        let number = Number(n.attrs?.start ?? 1);
        for (const item of n.content ?? []) {
          const children = await blocks(
            item.content ?? [],
            level,
            n.type === "bulletList" ? "bullet" : "ordered",
          );
          if (n.type === "orderedList") {
            const first = item.content?.[0];
            if (first?.type === "paragraph")
              children[0] = new Paragraph({
                children: [
                  new TextRun(`${number++}. `),
                  ...inline(first.content),
                ],
                indent: { left: 360 * (level + 1) },
              });
          }
          result.push(...children);
        }
        continue;
      }
      if (n.type === "blockquote" || n.type === "listItem") {
        result.push(...(await blocks(n.content ?? [], level + 1, list)));
        continue;
      }
      if (n.type === "table") {
        const rows: TableRow[] = [];
        for (const row of n.content ?? []) {
          const cells: TableCell[] = [];
          for (const cell of row.content ?? []) {
            const children = await blocks(cell.content ?? []);
            cells.push(
              new TableCell({
                children: children.filter(
                  (c): c is Paragraph | Table =>
                    !(c instanceof TableOfContents),
                ),
                columnSpan: cell.attrs?.colspan,
                rowSpan: cell.attrs?.rowspan,
              }),
            );
          }
          rows.push(
            new TableRow({
              children: cells,
              tableHeader: row.content?.every((c) => c.type === "tableHeader"),
              cantSplit: true,
            }),
          );
        }
        result.push(
          new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        );
        continue;
      }
      if (n.type === "image") {
        const src = String(n.attrs?.src ?? "");
        if (!/^data:image\/(png|jpeg|webp);base64,/.test(src))
          throw new Error(
            "DOCX export requires embedded PNG/JPEG/WebP images. Reinsert external images as files.",
          );
        const image = await createImageBitmap(await (await fetch(src)).blob());
        const available =
          ((paperDimensions(format).width - format.left - format.right) * 96) /
          25.4;
        const scale = Math.min(1, available / image.width);
        let data: Uint8Array;
        let type: "png" | "jpg";
        if (src.startsWith("data:image/webp")) {
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          canvas.getContext("2d")!.drawImage(image, 0, 0);
          data = Uint8Array.from(
            atob(canvas.toDataURL("image/png").split(",")[1]!),
            (c) => c.charCodeAt(0),
          );
          type = "png";
        } else {
          data = Uint8Array.from(atob(src.split(",")[1]!), (c) =>
            c.charCodeAt(0),
          );
          type = src.startsWith("data:image/png") ? "png" : "jpg";
        }
        result.push(
          new Paragraph({
            children: [
              new ImageRun({
                data,
                type,
                transformation: {
                  width: image.width * scale,
                  height: image.height * scale,
                },
                altText: {
                  title: String(n.attrs?.alt ?? "Figure"),
                  description: String(n.attrs?.alt ?? ""),
                  name: "Figure",
                },
              }),
            ],
          }),
        );
        image.close();
        continue;
      }
      if (n.type === "pageBreak") {
        result.push(new Paragraph({ children: [new PageBreak()] }));
        continue;
      }
      if (n.type === "generatedIndex") {
        if (n.attrs?.kind === "toc") {
          result.push(
            new TableOfContents("Contents", {
              hyperlink: true,
              headingStyleRange: "1-3",
            }),
          );
          continue;
        }
        if (n.attrs?.kind === "bibliography") {
          const container = document.createElement("div");
          container.innerHTML = DOMPurify.sanitize(
            bibliography(sources, style, order),
          );
          const entries = container.querySelectorAll(".csl-entry");
          for (const entry of entries.length
            ? Array.from(entries)
            : [container])
            result.push(
              new Paragraph({
                children: bibliographyRuns(entry),
                indent: { left: 720, hanging: 720 },
              }),
            );
          continue;
        }
        for (const [caption, label] of captions)
          if (
            caption.attrs?.kind ===
            (n.attrs?.kind === "tables" ? "table" : "figure")
          )
            result.push(
              new Paragraph({
                children: [
                  new InternalHyperlink({
                    anchor: anchors.get(caption.attrs?.id)!,
                    children: [new TextRun(label)],
                  }),
                ],
              }),
            );
        continue;
      }
      const heading = n.type === "heading";
      let children =
        n.type === "caption"
          ? [new TextRun({ text: captions.get(n) ?? textOf(n), italics: true })]
          : inline(n.content);
      if (n.attrs?.id)
        children = [new Bookmark({ id: anchors.get(n.attrs.id)!, children })];
      result.push(
        new Paragraph({
          children,
          heading: heading
            ? [
                HeadingLevel.HEADING_1,
                HeadingLevel.HEADING_2,
                HeadingLevel.HEADING_3,
              ][Number(n.attrs?.level ?? 1) - 1]
            : undefined,
          keepNext: heading,
          pageBreakBefore: heading && !!n.attrs?.section,
          alignment: align(n.attrs?.textAlign),
          bullet: list === "bullet" ? { level: Math.min(level, 8) } : undefined,
          spacing: {
            after: format.paragraphSpacing * 20,
            line: format.lineHeight * 240,
          },
          indent:
            format.indent < 0
              ? { left: twips(-format.indent), hanging: twips(-format.indent) }
              : { firstLine: heading ? 0 : twips(format.indent) },
        }),
      );
    }
    return result;
  }
  const groups: { mode: string; nodes: JSONContent[] }[] = [];
  for (const n of content.content ?? []) {
    const mode = n.attrs?.section ?? groups.at(-1)?.mode ?? "main";
    if (!groups.length || mode !== groups.at(-1)?.mode)
      groups.push({ mode, nodes: [] });
    groups.at(-1)!.nodes.push(n);
  }
  const dimensions = paperDimensions(format);
  const sections: ISectionOptions[] = [];
  for (const group of groups) {
    const children = await blocks(group.nodes);
    sections.push({
      properties: {
        type: SectionType.NEXT_PAGE,
        page: {
          size: {
            width: twips(dimensions.width),
            height: twips(dimensions.height),
          },
          margin: {
            top: twips(format.top),
            bottom: twips(format.bottom),
            left: twips(format.left),
            right: twips(format.right),
          },
          pageNumbers: {
            start: 1,
            formatType:
              group.mode === "preliminary"
                ? NumberFormat.LOWER_ROMAN
                : NumberFormat.DECIMAL,
          },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              text: format.header,
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun(format.footer),
                ...(format.numbering
                  ? [new TextRun({ children: [" ", PageNumber.CURRENT] })]
                  : []),
              ],
            }),
          ],
        }),
      },
      children,
    });
  }
  const output = new Document({
    title,
    creator: "CollabCanvas Pages",
    features: { updateFields: true },
    styles: {
      default: {
        document: { run: { font: format.font, size: format.fontSize * 2 } },
      },
    },
    footnotes,
    sections: sections.length ? sections : [{ children: [new Paragraph("")] }],
  });
  return Packer.toBlob(output);
}
export async function exportManuscriptDocx(
  content: JSONContent,
  format: PaperFormat,
  sources: ReferenceSource[],
  style: CitationStyle,
  title: string,
) {
  downloadBlob(
    await buildDocx(content, format, sources, style, title),
    `${title}.docx`,
  );
}
export async function importManuscriptDocx(file: File) {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("DOCX imports are limited to 20 MB.");
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({
    arrayBuffer: await file.arrayBuffer(),
  });
  return {
    html: DOMPurify.sanitize(result.value),
    warnings: `${result.messages.length} conversion notices. Headers, page settings, tracked changes, and citation fields are not imported.`,
  };
}

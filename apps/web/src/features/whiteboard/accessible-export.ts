interface ExportableShape {
  id: string;
  props: unknown;
  type: string;
  x: number;
  y: number;
}

export interface AccessibleBoardItem {
  id: string;
  text: string | null;
  type: string;
  x: number;
  y: number;
}

function collectText(value: unknown, output: string[]): void {
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized) output.push(normalized);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectText(item, output);
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (["text", "content"].includes(key) || typeof child === "object") {
        collectText(child, output);
      }
    }
  }
}

function readShapeText(props: unknown): string | null {
  if (!props || typeof props !== "object") return null;
  const record = props as Record<string, unknown>;
  const textParts: string[] = [];
  for (const key of ["text", "richText", "altText", "name", "url"]) {
    collectText(record[key], textParts);
  }
  const uniqueParts = [...new Set(textParts)];
  return uniqueParts.length > 0 ? uniqueParts.join(" ") : null;
}

export function createAccessibleBoardItems(
  shapes: readonly ExportableShape[],
): AccessibleBoardItem[] {
  return [...shapes]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((shape) => ({
      id: shape.id,
      text: readShapeText(shape.props),
      type: shape.type,
      x: Math.round(shape.x),
      y: Math.round(shape.y),
    }));
}

export function createAccessibleBoardHtml(
  boardTitle: string,
  shapes: readonly ExportableShape[],
): string {
  const documentRoot = document.implementation.createHTMLDocument(boardTitle);
  documentRoot.documentElement.lang = "en";
  const viewport = documentRoot.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  documentRoot.head.append(viewport);

  const style = documentRoot.createElement("style");
  style.textContent =
    "body{max-width:52rem;margin:2rem auto;padding:0 1rem;font:1rem/1.6 system-ui,sans-serif;color:#20231f}h1,h2{line-height:1.25}li{margin-block:1.25rem}dl{display:grid;grid-template-columns:max-content 1fr;gap:.25rem 1rem}dt{font-weight:700}@media(prefers-color-scheme:dark){body{background:#191b19;color:#edeee9}}";
  documentRoot.head.append(style);

  const main = documentRoot.createElement("main");
  const heading = documentRoot.createElement("h1");
  heading.textContent = boardTitle;
  main.append(heading);
  const introduction = documentRoot.createElement("p");
  introduction.textContent =
    "Accessible text companion for the visual CollabCanvas board, ordered from top to bottom and left to right.";
  main.append(introduction);

  const items = createAccessibleBoardItems(shapes);
  if (items.length === 0) {
    const empty = documentRoot.createElement("p");
    empty.textContent = "This board contains no objects.";
    main.append(empty);
  } else {
    const list = documentRoot.createElement("ol");
    for (const item of items) {
      const listItem = documentRoot.createElement("li");
      const itemHeading = documentRoot.createElement("h2");
      itemHeading.textContent = `${item.type} object`;
      listItem.append(itemHeading);
      const details = documentRoot.createElement("dl");
      const detailEntries: Array<[string, string]> = [
        ["Text", item.text ?? "No textual content supplied"],
        ["Position", `x ${item.x}, y ${item.y}`],
        ["Object ID", item.id],
      ];
      for (const [term, value] of detailEntries) {
        const name = documentRoot.createElement("dt");
        name.textContent = term;
        const description = documentRoot.createElement("dd");
        description.textContent = value;
        details.append(name, description);
      }
      listItem.append(details);
      list.append(listItem);
    }
    main.append(list);
  }
  documentRoot.body.append(main);
  return `<!doctype html>\n${documentRoot.documentElement.outerHTML}`;
}

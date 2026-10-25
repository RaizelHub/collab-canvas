import type { Editor } from "@tiptap/core";
import type { JSONContent } from "@tiptap/core";
export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  position: number;
  kind?: string;
}
export function getOutline(editor: Editor): OutlineItem[] {
  const entries: OutlineItem[] = [];
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "heading" || node.type.name === "caption")
      entries.push({
        id: node.attrs.id || `position-${position}`,
        title: node.textContent,
        level: node.attrs.level ?? 4,
        position,
        kind: node.type.name === "caption" ? node.attrs.kind : undefined,
      });
  });
  return entries;
}
export function findMatches(
  editor: Editor,
  query: string,
): { from: number; to: number }[] {
  if (!query) return [];
  const matches: { from: number; to: number }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const text = node
      .textBetween(0, node.content.size, "", "\uFFFC")
      .toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    let index = text.indexOf(needle);
    while (index !== -1) {
      matches.push({
        from: pos + 1 + index,
        to: pos + 1 + index + query.length,
      });
      index = text.indexOf(needle, index + query.length);
    }
    return false;
  });
  return matches;
}
export function ensureAnchorIds(editor: Editor) {
  const tr = editor.state.tr;
  const seen = new Set<string>();
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading" || node.type.name === "caption") {
      const id = node.attrs.id;
      if (!id || seen.has(id)) {
        const newId = `anchor-${crypto.randomUUID()}`;
        tr.setNodeMarkup(pos, undefined, { ...node.attrs, id: newId });
        seen.add(newId);
      } else seen.add(id);
    }
  });
  if (tr.docChanged) editor.view.dispatch(tr.setMeta("addToHistory", false));
}
export function textOf(node: JSONContent): string {
  return node.text ?? (node.content ?? []).map(textOf).join("");
}

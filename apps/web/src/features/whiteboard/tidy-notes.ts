import type { Editor } from "tldraw";

/**
 * Arranges currently selected notes and shapes into a tidy, structured grid.
 */
export function tidySelectedShapes(editor: Editor) {
  const selectedShapes = editor.getSelectedShapes();
  if (selectedShapes.length < 2) return;

  const count = selectedShapes.length;
  const cols = Math.ceil(Math.sqrt(count));
  const padding = 20;

  // Determine uniform cell dimensions based on max bounding box of selection
  let maxW = 200;
  let maxH = 200;

  selectedShapes.forEach((shape) => {
    const bounds = editor.getShapePageBounds(shape.id);
    if (bounds) {
      if (bounds.w > maxW) maxW = bounds.w;
      if (bounds.h > maxH) maxH = bounds.h;
    }
  });

  // Starting anchor: Top-left most shape position
  const firstShape = selectedShapes[0];
  const firstBounds = firstShape ? editor.getShapePageBounds(firstShape.id) : null;
  const startX = firstBounds ? firstBounds.minX : 100;
  const startY = firstBounds ? firstBounds.minY : 100;

  editor.markHistoryStoppingPoint("tidy_shapes");

  selectedShapes.forEach((shape, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    const targetX = startX + col * (maxW + padding);
    const targetY = startY + row * (maxH + padding);

    editor.updateShape({
      id: shape.id,
      type: shape.type,
      x: targetX,
      y: targetY,
    });
  });
}

/**
 * Sorts selected sticky notes by color.
 */
export function sortSelectedNotesByColor(editor: Editor) {
  const selectedShapes = editor.getSelectedShapes().filter((s) => s.type === "note");
  if (selectedShapes.length < 2) return;

  const colorOrder = ["light-green", "green", "light-blue", "blue", "yellow", "orange", "light-red", "red", "grey", "black"];

  const sorted = [...selectedShapes].sort((a, b) => {
    const propsA = a.props as { color?: string } | undefined;
    const propsB = b.props as { color?: string } | undefined;
    const colorA = propsA?.color ?? "";
    const colorB = propsB?.color ?? "";
    return colorOrder.indexOf(colorA) - colorOrder.indexOf(colorB);
  });

  const firstSorted = sorted[0];
  const firstBounds = firstSorted ? editor.getShapePageBounds(firstSorted.id) : null;
  const startX = firstBounds ? firstBounds.minX : 100;
  const startY = firstBounds ? firstBounds.minY : 100;

  const cols = Math.ceil(Math.sqrt(sorted.length));
  const cardSize = 200;
  const gap = 20;

  editor.markHistoryStoppingPoint("sort_notes");

  sorted.forEach((shape, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;

    editor.updateShape({
      id: shape.id,
      type: shape.type,
      x: startX + col * (cardSize + gap),
      y: startY + row * (cardSize + gap),
    });
  });
}

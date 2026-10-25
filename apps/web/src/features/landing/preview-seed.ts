import {
  createShapeId,
  toRichText,
  type Editor,
  type TLShapePartial,
} from "tldraw";

/** Seeds only the disposable landing editor; never accesses storage or a room. */
export function seedLandingPreview(editor: Editor) {
  const shapes: TLShapePartial[] = [
    {
      id: createShapeId("preview-note-idea"),
      type: "note",
      x: 120,
      y: 90,
      rotation: -0.055,
      props: {
        color: "yellow",
        font: "sans",
        size: "m",
        align: "start",
        verticalAlign: "start",
        richText: toRichText(
          "What if we\ntried something\na little different?",
        ),
      },
    },
    {
      id: createShapeId("preview-note-sketch"),
      type: "note",
      x: 420,
      y: 160,
      rotation: 0.04,
      props: {
        color: "light-green",
        font: "sans",
        size: "m",
        align: "start",
        verticalAlign: "start",
        richText: toRichText("Less talking\nabout ideas.\nMore making."),
      },
    },
    {
      id: createShapeId("preview-note-build"),
      type: "note",
      x: 730,
      y: 75,
      rotation: -0.035,
      props: {
        color: "light-violet",
        font: "sans",
        size: "m",
        align: "start",
        verticalAlign: "start",
        richText: toRichText("Your next big\nthing starts\nright here. ✨"),
      },
    },
    {
      id: createShapeId("preview-arrow-one"),
      type: "arrow",
      x: 340,
      y: 170,
      props: {
        start: { x: 0, y: 0 },
        end: { x: 62, y: 62 },
        bend: -20,
        color: "black",
        size: "s",
        dash: "draw",
      },
    },
    {
      id: createShapeId("preview-arrow-two"),
      type: "arrow",
      x: 640,
      y: 230,
      props: {
        start: { x: 0, y: 0 },
        end: { x: 65, y: -70 },
        bend: 24,
        color: "black",
        size: "s",
        dash: "draw",
      },
    },
    {
      id: createShapeId("preview-caption"),
      type: "text",
      x: 170,
      y: 340,
      props: {
        font: "sans",
        size: "s",
        color: "grey",
        richText: toRichText("a small idea…"),
      },
    },
    {
      id: createShapeId("preview-caption-two"),
      type: "text",
      x: 720,
      y: 310,
      props: {
        font: "sans",
        size: "s",
        color: "grey",
        richText: toRichText("…a shared possibility."),
      },
    },
  ];
  editor.createShapes(shapes);
  if (editor.getViewportScreenBounds().w < 600) {
    editor.updateShapes([
      { id: createShapeId("preview-note-idea"), type: "note", x: 75, y: 40 },
      {
        id: createShapeId("preview-note-sketch"),
        type: "note",
        x: 210,
        y: 235,
      },
      { id: createShapeId("preview-note-build"), type: "note", x: 80, y: 435 },
    ]);
    editor.deleteShapes(
      [
        "preview-arrow-one",
        "preview-arrow-two",
        "preview-caption",
        "preview-caption-two",
      ].map((id) => createShapeId(id)),
    );
  }
  editor.selectNone();
  const viewport = editor.getViewportScreenBounds();
  const bounds = editor.getCurrentPageBounds();
  if (bounds) {
    const mobile = viewport.w < 600;
    const top = mobile ? 55 : 45;
    const bottom = mobile ? 120 : 55;
    const horizontal = mobile ? 55 : 110;
    const zoom = Math.min(
      (viewport.w - horizontal * 2) / bounds.w,
      (viewport.h - top - bottom) / bounds.h,
      1,
    );
    editor.setCamera({
      x: (viewport.w / zoom - bounds.w) / 2 - bounds.x,
      y: top / zoom - bounds.y,
      z: zoom,
    });
  }
}

import { describe, expect, it } from "vitest";

import {
  createAccessibleBoardHtml,
  createAccessibleBoardItems,
} from "./accessible-export";

const shapes = [
  {
    id: "shape:bottom",
    props: { richText: { content: [{ text: "Second note" }] } },
    type: "note",
    x: 20,
    y: 200,
  },
  {
    id: "shape:top",
    props: { text: "First label" },
    type: "text",
    x: 10,
    y: 10,
  },
];

describe("accessible board export", () => {
  it("orders objects spatially and extracts text", () => {
    expect(createAccessibleBoardItems(shapes)).toEqual([
      {
        id: "shape:top",
        text: "First label",
        type: "text",
        x: 10,
        y: 10,
      },
      {
        id: "shape:bottom",
        text: "Second note",
        type: "note",
        x: 20,
        y: 200,
      },
    ]);
  });

  it("creates a semantic standalone document and escapes user content", () => {
    const html = createAccessibleBoardHtml("Planning <script>", shapes);
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<main>");
    expect(html).toContain("<ol>");
    expect(html).toContain("Planning &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });
});

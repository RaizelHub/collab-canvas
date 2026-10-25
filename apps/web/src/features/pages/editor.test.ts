import { describe, it, expect } from "vitest";
import { Editor } from "@tiptap/core";
import * as Y from "yjs";
import Collaboration from "@tiptap/extension-collaboration";
import { academicExtensions } from "./extensions";
import { createManuscript, encodeUpdate, decodeUpdate } from "./document-state";
import { findMatches } from "./editor-utils";
import { DEFAULT_FORMAT } from "./model";
import { materializeHtml, printCss } from "./print-content";
import { citationLabels, missingFields, bibliography } from "./citations";
const source = {
  id: "test-source",
  type: "book" as const,
  title: "A test fixture, not a research source",
  authors: "Example, Alex",
  year: "2020",
  publisher: "Test Publisher",
  journal: "",
  volume: "",
  issue: "",
  pages: "",
  doi: "",
  url: "",
};
describe("Pages structured editing", () => {
  it("round trips a complete template through Yjs and edits rich text", () => {
    const doc = createManuscript("thesis", "Example");
    const recovered = new Y.Doc();
    Y.applyUpdate(
      recovered,
      decodeUpdate(encodeUpdate(Y.encodeStateAsUpdate(doc))),
    );
    expect(recovered.getMap("meta").get("title")).toBe("Example");
    expect(recovered.getXmlFragment("content").length).toBe(28);
    doc.destroy();
    recovered.destroy();
  });
  it("preserves concurrent text edits rather than overwriting a whole manuscript", () => {
    const seed = createManuscript("blank", "Concurrent");
    const a = new Y.Doc(),
      b = new Y.Doc();
    const state = Y.encodeStateAsUpdate(seed);
    Y.applyUpdate(a, state);
    Y.applyUpdate(b, state);
    const editorA = new Editor({
      extensions: [
        ...academicExtensions(true),
        Collaboration.configure({ document: a, field: "content" }),
      ],
    });
    const editorB = new Editor({
      extensions: [
        ...academicExtensions(true),
        Collaboration.configure({ document: b, field: "content" }),
      ],
    });
    editorA.commands.insertContentAt(1, "Alpha ");
    editorB.commands.insertContentAt(1, "Beta ");
    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));
    expect(editorA.getText()).toBe(editorB.getText());
    expect(editorA.getText()).toContain("Alpha");
    expect(editorA.getText()).toContain("Beta");
    editorA.destroy();
    editorB.destroy();
    a.destroy();
    b.destroy();
    seed.destroy();
  });
  it("finds and replaces text without losing surrounding structure", () => {
    const e = new Editor({
      extensions: academicExtensions(),
      content: "<h1>Topic</h1><p>Find this and this.</p>",
    });
    const matches = findMatches(e, "this");
    expect(matches).toHaveLength(2);
    const tr = e.state.tr;
    for (const match of matches.reverse())
      tr.insertText("that", match.from, match.to);
    e.view.dispatch(tr);
    expect(e.getHTML()).toContain("Find that and that.");
    expect(e.getJSON().content?.[0]?.type).toBe("heading");
    e.destroy();
  });
});
describe("Pages generated academic content", () => {
  it("formats APA, IEEE, and MLA using supplied metadata", () => {
    expect(
      citationLabels([source], "apa", [source.id]).get(source.id),
    ).toContain("2020");
    expect(
      citationLabels([source], "ieee", [source.id]).get(source.id),
    ).toContain("1");
    expect(
      citationLabels([source], "mla", [source.id]).get(source.id),
    ).toContain("Example");
    expect(bibliography([source], "apa", [source.id])).toContain(source.title);
    expect(missingFields({ ...source, authors: "", year: "" })).toEqual([
      "author",
      "year",
    ]);
  });
  it("builds contents, numbered captions and cross references; sanitizes markup", () => {
    const html = materializeHtml(
      '<h1 id="main" data-section="main">Introduction</h1><div data-generated="toc"></div><p id="figure-a" data-caption="figure">System design</p><a data-cross-reference="figure-a">Old title</a><div data-generated="figures"></div><script>alert(1)</script>',
      [],
      "apa",
    );
    expect(html).toContain("Figure 1. System design");
    expect(html).toContain('data-toc-target="figure-a"');
    expect(html).not.toContain("<script>");
    expect(printCss(DEFAULT_FORMAT)).toContain("size:210mm 297mm");
  });
});

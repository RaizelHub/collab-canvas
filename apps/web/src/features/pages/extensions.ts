import { Extension, Node, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";

const AcademicAttributes = Extension.create({
  name: "academicAttributes",
  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          id: {
            default: null,
            parseHTML: (el) => el.id || null,
            renderHTML: (attrs) => (attrs.id ? { id: attrs.id } : {}),
          },
          section: {
            default: null,
            parseHTML: (el) => el.getAttribute("data-section"),
            renderHTML: (attrs) =>
              attrs.section ? { "data-section": attrs.section } : {},
          },
        },
      },
      {
        types: ["paragraph"],
        attributes: {
          indent: {
            default: null,
            parseHTML: (el) => el.style.textIndent || null,
            renderHTML: (attrs) =>
              attrs.indent ? { style: `text-indent:${attrs.indent}` } : {},
          },
        },
      },
    ];
  },
});
const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "div[data-page-break]" }],
  renderHTML: () => [
    "div",
    { "data-page-break": "true", class: "manuscript-page-break" },
    "Page break",
  ],
});
const Citation = Node.create({
  name: "citation",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    sourceId: { default: "" },
    label: { default: "[Citation]" },
  }),
  parseHTML: () => [
    {
      tag: "span[data-citation]",
      getAttrs: (el) => ({
        sourceId: el.getAttribute("data-citation"),
        label: el.textContent,
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "span",
    { "data-citation": node.attrs.sourceId, class: "manuscript-citation" },
    node.attrs.label,
  ],
});
const CrossReference = Node.create({
  name: "crossReference",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    target: { default: "" },
    label: { default: "[Cross-reference]" },
  }),
  parseHTML: () => [
    {
      tag: "a[data-cross-reference]",
      getAttrs: (el) => ({
        target: el.getAttribute("data-cross-reference"),
        label: el.textContent,
      }),
    },
  ],
  renderHTML: ({ node }) => [
    "a",
    {
      "data-cross-reference": node.attrs.target,
      href: `#${node.attrs.target}`,
    },
    node.attrs.label,
  ],
});
const Caption = Node.create({
  name: "caption",
  group: "block",
  content: "inline*",
  addAttributes: () => ({ id: { default: null }, kind: { default: "figure" } }),
  parseHTML: () => [
    {
      tag: "p[data-caption]",
      getAttrs: (el) => ({ id: el.id, kind: el.getAttribute("data-caption") }),
    },
  ],
  renderHTML: ({ node }) => [
    "p",
    {
      id: node.attrs.id,
      "data-caption": node.attrs.kind,
      class: "manuscript-caption",
    },
    0,
  ],
});
const Footnote = Node.create({
  name: "footnote",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ id: { default: null }, text: { default: "" } }),
  parseHTML: () => [
    {
      tag: "span[data-footnote]",
      getAttrs: (el) => ({ id: el.id, text: el.getAttribute("data-footnote") }),
    },
  ],
  renderHTML: ({ node }) => [
    "span",
    {
      "data-footnote": node.attrs.text,
      id: node.attrs.id,
      class: "manuscript-footnote",
    },
    node.attrs.text,
  ],
});
const GeneratedIndex = Node.create({
  name: "generatedIndex",
  group: "block",
  atom: true,
  addAttributes: () => ({ kind: { default: "toc" } }),
  parseHTML: () => [
    {
      tag: "div[data-generated]",
      getAttrs: (el) => ({ kind: el.getAttribute("data-generated") }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    { "data-generated": node.attrs.kind, class: "manuscript-generated" },
    `Automatic ${node.attrs.kind === "toc" ? "table of contents" : node.attrs.kind}. Updated in Print layout and exports.`,
  ],
});
export function academicExtensions(collaborative = false): Extensions {
  return [
    StarterKit.configure({
      undoRedo: collaborative ? false : {},
      link: { openOnClick: false, protocols: ["https", "http", "mailto"] },
    }),
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TextStyle,
    FontFamily,
    FontSize,
    AcademicAttributes,
    PageBreak,
    Citation,
    CrossReference,
    Caption,
    Footnote,
    GeneratedIndex,
    Extension.create({
      name: "academicShortcuts",
      addKeyboardShortcuts() {
        return {
          "Mod-Enter": () =>
            this.editor.commands.insertContent({ type: "pageBreak" }),
        };
      },
    }),
  ];
}

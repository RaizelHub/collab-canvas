import { describe, expect, it } from "vitest";
import { ACADEMIC_TEMPLATES, templateContent } from "./templates";
import {
  DEFAULT_FORMAT,
  paperDimensions,
  validateFormat,
  canWrite,
  canComment,
} from "./model";
describe("academic document foundation", () => {
  it("provides six structured, editable starting points with no fabricated sources", () => {
    expect(ACADEMIC_TEMPLATES).toHaveLength(6);
    for (const template of ACADEMIC_TEMPLATES) {
      const doc = templateContent(template.id);
      expect(doc.type).toBe("doc");
      expect(doc.content?.filter((n) => n.type === "heading")).toHaveLength(
        template.sections.length,
      );
      expect(JSON.stringify(doc)).not.toContain("citation");
    }
    expect(
      templateContent("thesis").content?.filter(
        (n) => n.attrs?.section === "preliminary",
      ),
    ).toHaveLength(7);
  });
  it("validates usable paper space and resolves orientation", () => {
    expect(validateFormat(DEFAULT_FORMAT)).toBeNull();
    expect(
      paperDimensions({ ...DEFAULT_FORMAT, orientation: "landscape" }),
    ).toEqual({ width: 297, height: 210 });
    expect(validateFormat({ ...DEFAULT_FORMAT, left: 200 })).toBeTruthy();
    expect(validateFormat({ ...DEFAULT_FORMAT, fontSize: NaN })).toBeTruthy();
  });
  it("separates write and comment permissions", () => {
    expect(canWrite("editor")).toBe(true);
    expect(canWrite("commenter")).toBe(false);
    expect(canComment("commenter")).toBe(true);
    expect(canComment("viewer")).toBe(false);
  });
});

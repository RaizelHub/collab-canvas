import { describe, it, expect } from "vitest";
import { buildDocx } from "./docx-export";
import { DEFAULT_FORMAT } from "./model";
import { templateContent } from "./templates";
import { extractRawText } from "mammoth";
import { Buffer } from "node:buffer";
describe("DOCX export", () => {
  it("produces an openable Word package with the manuscript text", async () => {
    const blob = await buildDocx(
      templateContent("thesis"),
      DEFAULT_FORMAT,
      [],
      "apa",
      "Export test",
    );
    const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    expect(new Uint8Array(bytes).slice(0, 2)).toEqual(new Uint8Array([80, 75]));
    const result = await extractRawText({ buffer: Buffer.from(bytes) });
    expect(result.value).toContain("Chapter 1: Introduction");
    expect(result.value).toContain("Appendices");
    expect(result.value).toContain("[Your research title]");
  });
});

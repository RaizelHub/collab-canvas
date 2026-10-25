import { describe, it, expect } from "vitest";
import { createManuscript } from "./document-state";
import { validateRecovery } from "./recovery-validation";
describe("recovery validation", () => {
  it("accepts structured manuscripts and rejects invalid metadata before persistence", () => {
    const doc = createManuscript("thesis", "Recovery");
    expect(() => validateRecovery(doc)).not.toThrow();
    doc.getMap("format").set("left", 500);
    expect(() => validateRecovery(doc)).toThrow("paper settings");
    doc.destroy();
  });
  it("rejects malformed sources and checkpoints", () => {
    const doc = createManuscript("blank", "Recovery");
    doc.getMap("references").set("broken", { title: "Incomplete structure" });
    expect(() => validateRecovery(doc)).toThrow("reference metadata");
    doc.getMap("references").clear();
    doc.getMap("revisions").set("broken", { id: "broken" });
    expect(() => validateRecovery(doc)).toThrow("checkpoint");
    doc.destroy();
  });
});

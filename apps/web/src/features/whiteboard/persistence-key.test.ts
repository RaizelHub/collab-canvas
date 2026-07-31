import { describe, expect, it } from "vitest";

import { getBoardPersistenceKey } from "./persistence-key";

describe("getBoardPersistenceKey", () => {
  it("isolates tldraw persistence by board ID", () => {
    expect(getBoardPersistenceKey("board-a")).toBe(
      "collab-canvas-board-board-a",
    );
    expect(getBoardPersistenceKey("board-a")).not.toBe(
      getBoardPersistenceKey("board-b"),
    );
  });
});

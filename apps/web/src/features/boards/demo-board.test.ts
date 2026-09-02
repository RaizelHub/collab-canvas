import { describe, expect, it } from "vitest";
import { getOrCreateDemoBoard } from "./demo-board";

describe("demo-board", () => {
  it("creates or returns demo showcase board", () => {
    const board = getOrCreateDemoBoard();
    expect(board).toBeDefined();
    expect(board.id).toBeDefined();
    expect(board.title).toContain("Showcase");
  });
});

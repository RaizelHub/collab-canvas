import { describe, expect, it, vi } from "vitest";

import { createLocalBoardRepository } from "./local-board-repository";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const BOARD_A = "00000000-0000-4000-8000-000000000001";
const BOARD_B = "00000000-0000-4000-8000-000000000002";

function idSequence(ids: string[]): () => string {
  return () => {
    const id = ids.shift();
    if (!id) throw new Error("No test ID remains.");
    return id;
  };
}

describe("local board repository", () => {
  it("creates boards with unique secure IDs", () => {
    const repository = createLocalBoardRepository({
      storage: new MemoryStorage(),
      generateId: idSequence([BOARD_A, BOARD_B]),
      now: () => new Date("2026-07-31T00:00:00.000Z"),
    });

    const first = repository.createBoard();
    const second = repository.createBoard();

    if (!first.ok || !second.ok) {
      throw new Error("Test boards were not created.");
    }
    expect(first.value.id).toBe(BOARD_A);
    expect(second.value.id).toBe(BOARD_B);
    expect(first.value.id).not.toBe(second.value.id);
  });

  it("renames a board and rejects an empty title", () => {
    const repository = createLocalBoardRepository({
      storage: new MemoryStorage(),
      generateId: () => BOARD_A,
      now: () => new Date("2026-07-31T00:00:00.000Z"),
    });
    repository.createBoard();

    const renamed = repository.renameBoard(BOARD_A, "  Planning  ");
    const rejected = repository.renameBoard(BOARD_A, "   ");

    expect(renamed.ok && renamed.value.title).toBe("Planning");
    expect(rejected.ok).toBe(false);
    if (!rejected.ok) {
      expect(rejected.error.code).toBe("invalid_title");
    }
  });

  it("deletes only the selected board", () => {
    const repository = createLocalBoardRepository({
      storage: new MemoryStorage(),
      generateId: idSequence([BOARD_A, BOARD_B]),
    });
    repository.createBoard();
    repository.createBoard();

    expect(repository.deleteBoard(BOARD_A)).toEqual({
      ok: true,
      value: true,
    });
    const remaining = repository.getBoards();
    expect(remaining.ok && remaining.value.map((board) => board.id)).toEqual([
      BOARD_B,
    ]);
  });

  it("sorts boards by the most recent opened date", () => {
    let currentTime = new Date("2026-07-31T00:00:00.000Z");
    const repository = createLocalBoardRepository({
      storage: new MemoryStorage(),
      generateId: idSequence([BOARD_A, BOARD_B]),
      now: () => currentTime,
    });
    repository.createBoard();
    currentTime = new Date("2026-07-31T01:00:00.000Z");
    repository.createBoard();
    currentTime = new Date("2026-07-31T02:00:00.000Z");
    repository.markBoardOpened(BOARD_A);

    const result = repository.getBoards();
    expect(result.ok && result.value.map((board) => board.id)).toEqual([
      BOARD_A,
      BOARD_B,
    ]);
  });

  it("reports malformed stored board data without overwriting it", () => {
    const storage = new MemoryStorage();
    storage.setItem("collab-canvas-local-boards", "{broken-json");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const repository = createLocalBoardRepository({ storage });

    const result = repository.getBoards();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("malformed_data");
    }
    expect(storage.getItem("collab-canvas-local-boards")).toBe("{broken-json");
    consoleError.mockRestore();
  });

  it("returns null for a missing board", () => {
    const repository = createLocalBoardRepository({
      storage: new MemoryStorage(),
    });

    expect(repository.getBoardById(BOARD_A)).toEqual({
      ok: true,
      value: null,
    });
  });
});

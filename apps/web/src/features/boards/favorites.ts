const STORAGE_KEY = "collab-canvas:starred-boards";

export function getStarredBoardIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(
        parsed.filter((item): item is string => typeof item === "string"),
      );
    }
  } catch {
    // ignore parse failure
  }
  return new Set();
}

export function isBoardStarred(boardId: string): boolean {
  return getStarredBoardIds().has(boardId);
}

export function toggleStarredBoard(boardId: string): boolean {
  const current = getStarredBoardIds();
  const nextStarred = !current.has(boardId);

  if (nextStarred) {
    current.add(boardId);
  } else {
    current.delete(boardId);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    // ignore storage error
  }

  return nextStarred;
}

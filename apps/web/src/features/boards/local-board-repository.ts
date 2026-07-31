import { localBoardsSchema, type LocalBoard } from "./local-board";

const STORAGE_KEY = "collab-canvas-local-boards";

export type LocalBoardRepositoryErrorCode =
  | "invalid_title"
  | "malformed_data"
  | "missing_board"
  | "storage_unavailable"
  | "write_failed";

export interface LocalBoardRepositoryError {
  code: LocalBoardRepositoryErrorCode;
  message: string;
}

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: LocalBoardRepositoryError };

interface RepositoryOptions {
  storage?: Storage | null;
  generateId?: () => string;
  now?: () => Date;
}

export interface LocalBoardRepository {
  clearBoards(): RepositoryResult<void>;
  createBoard(): RepositoryResult<LocalBoard>;
  deleteBoard(id: string): RepositoryResult<boolean>;
  getBoardById(id: string): RepositoryResult<LocalBoard | null>;
  getBoards(): RepositoryResult<LocalBoard[]>;
  markBoardOpened(id: string): RepositoryResult<LocalBoard>;
  renameBoard(id: string, title: string): RepositoryResult<LocalBoard>;
}

function resolveBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch (error) {
    console.error("Local board storage is unavailable.", error);
    return null;
  }
}

function storageError(): RepositoryResult<never> {
  return {
    ok: false,
    error: {
      code: "storage_unavailable",
      message:
        "Local board storage is unavailable. Check this browser's storage settings.",
    },
  };
}

export function createLocalBoardRepository(
  options: RepositoryOptions = {},
): LocalBoardRepository {
  const getStorage =
    options.storage === undefined
      ? resolveBrowserStorage
      : () => options.storage ?? null;
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date());

  const getBoards = (): RepositoryResult<LocalBoard[]> => {
    const storage = getStorage();
    if (!storage) {
      return storageError();
    }

    try {
      const rawValue = storage.getItem(STORAGE_KEY);
      if (rawValue === null) {
        return { ok: true, value: [] };
      }

      const parsedJson: unknown = JSON.parse(rawValue);
      const parsedBoards = localBoardsSchema.safeParse(parsedJson);
      if (!parsedBoards.success) {
        console.error(
          "Stored local board metadata is malformed.",
          parsedBoards.error,
        );
        return {
          ok: false,
          error: {
            code: "malformed_data",
            message:
              "Local board data is corrupted. Reset local boards to continue.",
          },
        };
      }

      return {
        ok: true,
        value: [...parsedBoards.data].sort(
          (left, right) =>
            Date.parse(right.lastOpenedAt) - Date.parse(left.lastOpenedAt),
        ),
      };
    } catch (error) {
      console.error("Could not read local board metadata.", error);
      return {
        ok: false,
        error: {
          code:
            error instanceof SyntaxError
              ? "malformed_data"
              : "storage_unavailable",
          message:
            error instanceof SyntaxError
              ? "Local board data is corrupted. Reset local boards to continue."
              : "Local boards could not be read from this browser.",
        },
      };
    }
  };

  const saveBoards = (boards: LocalBoard[]): RepositoryResult<LocalBoard[]> => {
    const storage = getStorage();
    if (!storage) {
      return storageError();
    }

    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(boards));
      return { ok: true, value: boards };
    } catch (error) {
      console.error("Could not save local board metadata.", error);
      return {
        ok: false,
        error: {
          code: "write_failed",
          message:
            "The board could not be saved locally. Check available browser storage.",
        },
      };
    }
  };

  const getBoardById = (id: string): RepositoryResult<LocalBoard | null> => {
    const result = getBoards();
    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      value: result.value.find((board) => board.id === id) ?? null,
    };
  };

  const createBoard = (): RepositoryResult<LocalBoard> => {
    const result = getBoards();
    if (!result.ok) {
      return result;
    }

    const timestamp = now().toISOString();
    const board: LocalBoard = {
      id: generateId(),
      title: "Untitled board",
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
    };
    const saved = saveBoards([board, ...result.value]);

    return saved.ok ? { ok: true, value: board } : saved;
  };

  const renameBoard = (
    id: string,
    title: string,
  ): RepositoryResult<LocalBoard> => {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length === 0) {
      return {
        ok: false,
        error: {
          code: "invalid_title",
          message: "Board title cannot be empty.",
        },
      };
    }

    const result = getBoards();
    if (!result.ok) {
      return result;
    }

    const board = result.value.find((candidate) => candidate.id === id);
    if (!board) {
      return {
        ok: false,
        error: {
          code: "missing_board",
          message: "This local board no longer exists.",
        },
      };
    }

    const renamedBoard: LocalBoard = {
      ...board,
      title: trimmedTitle.slice(0, 120),
      updatedAt: now().toISOString(),
    };
    const saved = saveBoards(
      result.value.map((candidate) =>
        candidate.id === id ? renamedBoard : candidate,
      ),
    );

    return saved.ok ? { ok: true, value: renamedBoard } : saved;
  };

  const deleteBoard = (id: string): RepositoryResult<boolean> => {
    const result = getBoards();
    if (!result.ok) {
      return result;
    }

    const nextBoards = result.value.filter((board) => board.id !== id);
    const saved = saveBoards(nextBoards);
    return saved.ok
      ? { ok: true, value: nextBoards.length !== result.value.length }
      : saved;
  };

  const markBoardOpened = (id: string): RepositoryResult<LocalBoard> => {
    const result = getBoards();
    if (!result.ok) {
      return result;
    }

    const board = result.value.find((candidate) => candidate.id === id);
    if (!board) {
      return {
        ok: false,
        error: {
          code: "missing_board",
          message: "This local board does not exist.",
        },
      };
    }

    const openedBoard: LocalBoard = {
      ...board,
      lastOpenedAt: now().toISOString(),
    };
    const saved = saveBoards(
      result.value.map((candidate) =>
        candidate.id === id ? openedBoard : candidate,
      ),
    );

    return saved.ok ? { ok: true, value: openedBoard } : saved;
  };

  const clearBoards = (): RepositoryResult<void> => {
    const storage = getStorage();
    if (!storage) {
      return storageError();
    }

    try {
      storage.removeItem(STORAGE_KEY);
      return { ok: true, value: undefined };
    } catch (error) {
      console.error("Could not clear local board metadata.", error);
      return {
        ok: false,
        error: {
          code: "write_failed",
          message: "Local board data could not be reset.",
        },
      };
    }
  };

  return {
    clearBoards,
    createBoard,
    deleteBoard,
    getBoardById,
    getBoards,
    markBoardOpened,
    renameBoard,
  };
}

export const localBoardRepository = createLocalBoardRepository();

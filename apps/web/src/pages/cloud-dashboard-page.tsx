import { LayoutGrid, LoaderCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { useAuth } from "../features/auth/auth-context";
import { BoardCard } from "../features/boards/board-card";
import { CreateBoardButton } from "../features/boards/create-board-button";
import { DeleteBoardDialog } from "../features/boards/delete-board-dialog";
import {
  createSupabaseBoardRepository,
  type CloudBoard,
} from "../features/boards/supabase-board-repository";
import { supabase } from "../lib/supabase";
import { syncServerUrl } from "../lib/env";

export function CloudDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const repository = useMemo(
    () =>
      supabase && user
        ? createSupabaseBoardRepository(supabase, user.id)
        : null,
    [user],
  );
  const [boards, setBoards] = useState<CloudBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "owner" | "editor" | "viewer"
  >("all");
  const [sortBy, setSortBy] = useState<"recent" | "updated" | "title">(
    "recent",
  );
  const [boardToDelete, setBoardToDelete] = useState<CloudBoard | null>(null);

  const refreshBoards = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    try {
      setBoards(await repository.list());
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Boards could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    queueMicrotask(() => void refreshBoards());
  }, [refreshBoards]);

  const createBoard = async () => {
    if (!repository || busy) return;
    setBusy(true);
    try {
      const board = await repository.create();
      navigate(`/board/${board.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "The board could not be created.",
      );
      setBusy(false);
    }
  };

  const openBoard = (board: CloudBoard) => {
    if (!repository) return;
    void repository.markOpened(board.id).catch((activityError: unknown) => {
      console.error("Recent board activity could not be saved.", activityError);
    });
    navigate(`/board/${board.id}`);
  };

  const renameBoard = (board: CloudBoard, title: string): string | null => {
    if (!repository || !title.trim()) return "Board title cannot be empty.";
    void repository
      .rename(board.id, title)
      .then(refreshBoards)
      .catch((renameError: unknown) => {
        setError(
          renameError instanceof Error
            ? renameError.message
            : "The board could not be renamed.",
        );
      });
    return null;
  };

  const deleteBoard = async () => {
    if (!repository || !boardToDelete) return;
    const target = boardToDelete;
    setBoardToDelete(null);
    try {
      if (syncServerUrl && supabase) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session expired. Sign in again.");
        const cleanup = await fetch(
          `${syncServerUrl}/boards/${target.id}/state`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!cleanup.ok) {
          throw new Error("The board could not be deleted.");
        }
      } else {
        await repository.remove(target.id);
      }
      setBoards((current) => current.filter((board) => board.id !== target.id));
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "The board could not be deleted.",
      );
    }
  };

  const duplicateBoard = async (board: CloudBoard) => {
    if (!syncServerUrl || !supabase) {
      setError("The sync worker is required to duplicate a board.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const response = await fetch(
        `${syncServerUrl}/boards/${board.id}/duplicate`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = (await response.json()) as {
        boardId?: string;
        error?: string;
      };
      if (!response.ok || !result.boardId) {
        throw new Error(result.error ?? "Board duplication failed.");
      }
      navigate(`/board/${result.boardId}`);
    } catch (duplicateError) {
      setError(
        duplicateError instanceof Error
          ? duplicateError.message
          : "The board could not be duplicated.",
      );
      setBusy(false);
    }
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const routeFilter =
    location.pathname === "/boards/shared"
      ? "shared"
      : location.pathname === "/boards/recent"
        ? "recent"
        : "all";
  const filteredBoards = boards
    .filter(
      (board) =>
        board.title.toLocaleLowerCase().includes(normalizedSearch) &&
        (roleFilter === "all" || board.role === roleFilter) &&
        (routeFilter !== "shared" || !board.canManage),
    )
    .sort((left, right) => {
      if (sortBy === "title") return left.title.localeCompare(right.title);
      const field = sortBy === "updated" ? "updatedAt" : "lastOpenedAt";
      return Date.parse(right[field]) - Date.parse(left[field]);
    });

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Workspace
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
            Boards
          </h1>
          <p className="mt-1 text-sm text-muted">
            Your boards and boards shared with you.
          </p>
        </div>
        <CreateBoardButton onCreate={() => void createBoard()} />
      </div>

      {error && (
        <div
          className="mt-5 border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm"
          role="alert"
        >
          {error}
          <button
            className="ml-3 font-medium underline"
            onClick={() => void refreshBoards()}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <h2 className="text-sm font-semibold">Recent boards</h2>
        <label>
          <span className="sr-only">Filter by role</span>
          <select
            className="h-9 border border-line bg-panel px-2 text-sm"
            onChange={(event) =>
              setRoleFilter(
                event.target.value as "all" | "owner" | "editor" | "viewer",
              )
            }
            value={roleFilter}
          >
            <option value="all">All roles</option>
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort boards</span>
          <select
            className="h-9 border border-line bg-panel px-2 text-sm"
            onChange={(event) =>
              setSortBy(event.target.value as "recent" | "updated" | "title")
            }
            value={sortBy}
          >
            <option value="recent">Recently opened</option>
            <option value="updated">Recently updated</option>
            <option value="title">Alphabetical</option>
          </select>
        </label>
        <label className="relative w-full max-w-xs">
          <span className="sr-only">Search boards</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
          <input
            className="h-9 w-full border border-line bg-panel pl-9 pr-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search boards"
            type="search"
            value={searchQuery}
          />
        </label>
      </div>

      {loading ? (
        <div className="grid min-h-80 place-items-center text-sm text-muted">
          <span className="flex items-center gap-2">
            <LoaderCircle className="size-4 animate-spin" />
            Loading boards
          </span>
        </div>
      ) : filteredBoards.length > 0 ? (
        <section
          aria-label="Boards"
          className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredBoards.map((board) => (
            <BoardCard
              board={board}
              canManage={board.canManage}
              key={board.id}
              onDelete={setBoardToDelete}
              onDuplicate={(target) => void duplicateBoard(target)}
              onOpen={openBoard}
              onRename={renameBoard}
              ownerLabel={board.ownerName}
              roleLabel={board.role}
            />
          ))}
        </section>
      ) : (
        <section className="grid min-h-80 place-items-center py-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid size-12 place-items-center border border-line bg-panel text-muted">
              <LayoutGrid className="size-5" />
            </div>
            <h2 className="mt-5 text-base font-semibold">
              {boards.length === 0 ? "No boards yet" : "No matching boards"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {boards.length === 0
                ? "Create a board to start collaborating."
                : "Try a different search term."}
            </p>
          </div>
        </section>
      )}

      {boardToDelete && (
        <DeleteBoardDialog
          board={boardToDelete}
          cloud
          onCancel={() => setBoardToDelete(null)}
          onConfirm={() => void deleteBoard()}
        />
      )}
    </main>
  );
}

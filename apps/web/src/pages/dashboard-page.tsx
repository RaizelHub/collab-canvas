import { LayoutGrid, Search, Sparkles, Star } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";

import { BoardCard } from "../features/boards/board-card";
import { CreateBoardButton } from "../features/boards/create-board-button";
import { DeleteBoardDialog } from "../features/boards/delete-board-dialog";
import { getStarredBoardIds, isBoardStarred, toggleStarredBoard } from "../features/boards/favorites";
import type { LocalBoard } from "../features/boards/local-board";
import {
  localBoardRepository,
  type LocalBoardRepository,
  type LocalBoardRepositoryError,
} from "../features/boards/local-board-repository";
import { TemplatePickerDialog } from "../features/templates/template-picker-dialog";
import type { BoardTemplate } from "../features/templates/templates";
import { clientEnvironment } from "../lib/env";
import { isSupabaseConfigured } from "../lib/supabase";
import { CloudDashboardPage } from "./cloud-dashboard-page";

interface DashboardPageProps {
  repository?: LocalBoardRepository;
}

export function DashboardPage({ repository }: DashboardPageProps) {
  if (!repository && isSupabaseConfigured()) {
    return <CloudDashboardPage />;
  }

  return <LocalDashboardPage repository={repository ?? localBoardRepository} />;
}

function LocalDashboardPage({
  repository,
}: {
  repository: LocalBoardRepository;
}) {
  const navigate = useNavigate();
  const backendReady = isSupabaseConfigured();
  const initialResult = useMemo(() => repository.getBoards(), [repository]);
  const [boards, setBoards] = useState<LocalBoard[]>(
    initialResult.ok ? initialResult.value : [],
  );
  const [storageError, setStorageError] =
    useState<LocalBoardRepositoryError | null>(
      initialResult.ok ? null : initialResult.error,
    );
  const [searchQuery, setSearchQuery] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState<LocalBoard | null>(null);
  const [starredIds, setStarredIds] = useState<Set<string>>(
    () => new Set(getStarredBoardIds()),
  );

  const toggleStar = (board: LocalBoard) => {
    toggleStarredBoard(board.id);
    setStarredIds(new Set(getStarredBoardIds()));
  };

  const refreshBoards = useCallback(() => {
    const result = repository.getBoards();
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    setBoards(result.value);
    setStorageError(null);
  }, [repository]);

  const createLocalBoard = () => {
    const result = repository.createBoard();
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    navigate(`/board/${result.value.id}`);
  };

  const openBoard = (board: LocalBoard) => {
    const result = repository.markBoardOpened(board.id);
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    navigate(`/board/${board.id}`);
  };

  const renameBoard = (board: LocalBoard, title: string): string | null => {
    const result = repository.renameBoard(board.id, title);
    if (!result.ok) {
      if (result.error.code !== "invalid_title") {
        setStorageError(result.error);
      }
      return result.error.message;
    }
    refreshBoards();
    return null;
  };

  const deleteBoard = () => {
    if (!boardToDelete) return;
    const result = repository.deleteBoard(boardToDelete.id);
    setBoardToDelete(null);
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    refreshBoards();
  };

  const resetCorruptedBoards = () => {
    const result = repository.clearBoards();
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    refreshBoards();
  };

  const handleCreateFromTemplate = (template: BoardTemplate) => {
    const result = repository.createBoard(template.name);
    if (!result.ok) {
      setStorageError(result.error);
      return;
    }
    navigate(`/board/${result.value.id}`, { state: { templateId: template.id } });
  };

  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const filteredBoards = boards.filter(
    (board) =>
      board.title.toLocaleLowerCase().includes(normalizedSearch) &&
      (!starredOnly || starredIds.has(board.id)),
  );

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
            Your boards, templates, and whiteboard canvases.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="flex h-10 items-center gap-2 rounded-lg border border-line bg-panel px-3.5 text-sm font-medium text-ink shadow-xs transition hover:bg-hover hover:border-line-strong"
            onClick={() => setIsTemplatePickerOpen(true)}
            type="button"
          >
            <Sparkles className="size-4 text-accent" />
            <span>New from Template</span>
          </button>
          <CreateBoardButton onCreate={createLocalBoard} />
        </div>
      </div>

      {clientEnvironment.status === "invalid" && (
        <div
          className="mt-5 border-l-2 border-danger bg-danger-soft px-4 py-3 text-sm"
          role="alert"
        >
          <p className="font-medium">Supabase configuration is invalid.</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {clientEnvironment.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {!backendReady && clientEnvironment.status !== "invalid" && (
        <div
          className="mt-5 border-l-2 border-accent bg-panel px-4 py-3 text-sm"
          role="status"
        >
          <span className="font-medium">Local foundation mode.</span>{" "}
          <span className="text-muted">
            Add the two Supabase values in <code>apps/web/.env.local</code> when
            cloud sync begins. Local boards remain available now.
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-1">
          <button
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              !starredOnly
                ? "bg-accent text-white"
                : "border border-line bg-panel text-muted hover:bg-hover hover:text-ink"
            }`}
            onClick={() => setStarredOnly(false)}
            type="button"
          >
            All Boards ({boards.length})
          </button>
          <button
            className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              starredOnly
                ? "bg-amber-500 text-white"
                : "border border-line bg-panel text-muted hover:bg-hover hover:text-ink"
            }`}
            onClick={() => setStarredOnly(true)}
            type="button"
          >
            <Star className={`size-3 ${starredOnly ? "fill-white" : ""}`} />
            Starred
          </button>
        </div>

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

      {storageError ? (
        <section className="grid min-h-[320px] place-items-center py-12 text-center">
          <div className="max-w-md">
            <h2 className="text-base font-semibold">
              Local boards unavailable
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {storageError.message}
            </p>
            {storageError.code === "malformed_data" && (
              <button
                className="mt-5 h-9 border border-line bg-panel px-3 text-sm font-medium hover:bg-hover"
                onClick={resetCorruptedBoards}
                type="button"
              >
                Reset local boards
              </button>
            )}
          </div>
        </section>
      ) : filteredBoards.length > 0 ? (
        <section
          aria-label="Local boards"
          className="grid grid-cols-1 gap-3 py-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filteredBoards.map((board) => (
            <BoardCard
              board={board}
              isStarred={isBoardStarred(board.id)}
              key={board.id}
              onDelete={setBoardToDelete}
              onOpen={openBoard}
              onRename={renameBoard}
              onToggleStar={toggleStar}
            />
          ))}
        </section>
      ) : (
        <section className="grid min-h-[320px] place-items-center py-12 text-center">
          <div className="max-w-sm">
            <div className="mx-auto grid size-12 place-items-center border border-line bg-panel text-muted">
              <LayoutGrid aria-hidden="true" className="size-5" />
            </div>
            <h2 className="mt-5 text-base font-semibold">
              {boards.length === 0 ? "No boards yet" : "No matching boards"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              {boards.length === 0
                ? "Create a local board or choose a template to start drawing."
                : "Try a different search term or filter."}
            </p>
            {boards.length === 0 && (
              <div className="mt-5 flex justify-center">
                <CreateBoardButton onCreate={createLocalBoard} />
              </div>
            )}
          </div>
        </section>
      )}

      <TemplatePickerDialog
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
        onSelectTemplate={handleCreateFromTemplate}
      />

      {boardToDelete && (
        <DeleteBoardDialog
          board={boardToDelete}
          onCancel={() => setBoardToDelete(null)}
          onConfirm={deleteBoard}
        />
      )}
    </main>
  );
}

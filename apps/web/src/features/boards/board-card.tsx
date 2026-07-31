import { Clock3, Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import type { LocalBoard } from "./local-board";

interface BoardCardProps<Board extends LocalBoard> {
  board: Board;
  canManage?: boolean;
  ownerLabel?: string;
  roleLabel?: string;
  onDelete: (board: Board) => void;
  onDuplicate?: (board: Board) => void;
  onOpen: (board: Board) => void;
  onRename: (board: Board, title: string) => string | null;
}

function formatLastOpened(isoDate: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoDate));
}

export function BoardCard<Board extends LocalBoard>({
  board,
  canManage = true,
  onDelete,
  onDuplicate,
  onOpen,
  onRename,
  ownerLabel,
  roleLabel,
}: BoardCardProps<Board>) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(board.title);
  const [renameError, setRenameError] = useState<string | null>(null);
  const isCancellingRef = useRef(false);

  const cancelRename = () => {
    setDraftTitle(board.title);
    setRenameError(null);
    setIsRenaming(false);
  };

  const saveRename = () => {
    if (isCancellingRef.current) {
      isCancellingRef.current = false;
      return;
    }
    const error = onRename(board, draftTitle);
    if (error) {
      setRenameError(error);
      return;
    }
    setRenameError(null);
    setIsRenaming(false);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveRename();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      isCancellingRef.current = true;
      cancelRename();
      event.currentTarget.blur();
    }
  };

  return (
    <article className="group flex min-h-36 flex-col border border-line bg-panel p-4 transition hover:border-line-strong hover:shadow-sm">
      {isRenaming ? (
        <form onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor={`board-title-${board.id}`}>
            Board title
          </label>
          <input
            autoFocus
            className="h-9 w-full border border-accent bg-canvas px-2 text-sm font-semibold outline-none ring-2 ring-accent-soft"
            id={`board-title-${board.id}`}
            maxLength={120}
            onBlur={saveRename}
            onChange={(event) => setDraftTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            value={draftTitle}
          />
          {renameError && (
            <p className="mt-1 text-xs text-danger" role="alert">
              {renameError}
            </p>
          )}
        </form>
      ) : (
        <h2 className="truncate text-sm font-semibold">{board.title}</h2>
      )}

      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <Clock3 aria-hidden="true" className="size-3.5" />
        Last opened {formatLastOpened(board.lastOpenedAt)}
      </p>
      {(ownerLabel || roleLabel) && (
        <p className="mt-1 truncate text-xs text-muted">
          {ownerLabel}
          {ownerLabel && roleLabel ? " · " : ""}
          {roleLabel}
          {" · Updated "}
          {formatLastOpened(board.updatedAt)}
        </p>
      )}

      <div className="mt-auto flex items-center gap-1 border-t border-line pt-3">
        <button
          className="flex h-8 items-center gap-1.5 px-2 text-xs font-medium text-muted hover:bg-hover hover:text-ink"
          onClick={() => onOpen(board)}
          type="button"
        >
          <ExternalLink aria-hidden="true" className="size-3.5" />
          Open board
        </button>
        {canManage && (
          <>
            {onDuplicate && (
              <button
                aria-label={`Duplicate ${board.title}`}
                className="ml-auto grid size-8 place-items-center text-muted hover:bg-hover hover:text-ink"
                onClick={() => onDuplicate(board)}
                type="button"
              >
                <Copy aria-hidden="true" className="size-3.5" />
              </button>
            )}
            <button
              aria-label={`Rename ${board.title}`}
              className={`${onDuplicate ? "" : "ml-auto"} grid size-8 place-items-center text-muted hover:bg-hover hover:text-ink`}
              onClick={() => setIsRenaming(true)}
              type="button"
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </button>
            <button
              aria-label={`Delete ${board.title}`}
              className="grid size-8 place-items-center text-muted hover:bg-danger-soft hover:text-danger"
              onClick={() => onDelete(board)}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

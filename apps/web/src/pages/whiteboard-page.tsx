import {
  ArrowLeft,
  Check,
  Ellipsis,
  HardDrive,
  Moon,
  Share2,
  Sun,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router";

import { BrandMark } from "../components/brand-mark";
import { LocalModeBadge } from "../components/local-mode-badge";
import { localBoardRepository } from "../features/boards/local-board-repository";
import { getBoardPersistenceKey } from "../features/whiteboard/persistence-key";
import { WhiteboardCanvas } from "../features/whiteboard/whiteboard-canvas";
import { useTheme } from "../hooks/use-theme";
import { isSupabaseConfigured } from "../lib/supabase";
import { CloudWhiteboardPage } from "./cloud-whiteboard-page";

export function WhiteboardPage() {
  if (isSupabaseConfigured()) {
    return <CloudWhiteboardPage />;
  }

  return <LocalWhiteboardPage />;
}

function LocalWhiteboardPage() {
  const { boardId } = useParams();
  const { theme, toggleTheme } = useTheme();
  const initialBoardResult = useMemo(
    () =>
      boardId
        ? localBoardRepository.getBoardById(boardId)
        : {
            ok: true as const,
            value: null,
          },
    [boardId],
  );
  const [board, setBoard] = useState(
    initialBoardResult.ok ? initialBoardResult.value : null,
  );
  const [draftTitle, setDraftTitle] = useState(board?.title ?? "");
  const [titleError, setTitleError] = useState<string | null>(null);
  const isCancellingTitleRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<
    "Saved locally" | "Saving locally" | "Local changes"
  >("Saved locally");

  useEffect(() => {
    if (!boardId || !board) return;
    const opened = localBoardRepository.markBoardOpened(boardId);
    if (!opened.ok) {
      console.error(opened.error.message);
    }
  }, [boardId, board]);

  useEffect(() => {
    if (board?.title) document.title = `${board.title} — CollabCanvas`;
  }, [board?.title]);

  if (!boardId) {
    return <MissingBoardPage reason="The board URL is missing an ID." />;
  }

  if (!initialBoardResult.ok) {
    return <MissingBoardPage reason={initialBoardResult.error.message} />;
  }

  if (!board) {
    return <MissingBoardPage reason="This board does not exist locally." />;
  }

  const saveTitle = () => {
    if (isCancellingTitleRef.current) {
      isCancellingTitleRef.current = false;
      return;
    }
    if (draftTitle.trim() === board.title) {
      setDraftTitle(board.title);
      setTitleError(null);
      setSaveStatus("Saved locally");
      return;
    }

    setSaveStatus("Saving locally");
    const result = localBoardRepository.renameBoard(board.id, draftTitle);
    if (!result.ok) {
      setTitleError(result.error.message);
      setSaveStatus("Local changes");
      return;
    }

    setBoard(result.value);
    setDraftTitle(result.value.title);
    setTitleError(null);
    setSaveStatus("Saved locally");
  };

  const handleTitleSubmit = (event: FormEvent) => {
    event.preventDefault();
    saveTitle();
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      isCancellingTitleRef.current = true;
      setDraftTitle(board.title);
      setTitleError(null);
      setSaveStatus("Saved locally");
      event.currentTarget.blur();
    }
  };

  const persistenceKey = getBoardPersistenceKey(board.id);

  return (
    <main className="relative flex h-dvh min-h-0 flex-col bg-canvas text-ink">
      <a
        className="fixed left-3 top-3 z-[100] -translate-y-20 bg-accent px-3 py-2 text-sm font-semibold text-white transition focus:translate-y-0"
        href="#main-content"
      >
        Skip to canvas
      </a>
      <header className="z-10 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-panel px-3 sm:gap-3 sm:px-4">
        <Link
          aria-label="Back to dashboard"
          className="grid size-8 place-items-center text-muted transition hover:bg-hover hover:text-ink"
          to="/dashboard"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <BrandMark />
        <form className="min-w-0 max-w-64 flex-1" onSubmit={handleTitleSubmit}>
          <label className="sr-only" htmlFor="whiteboard-title">
            Board title
          </label>
          <input
            className="h-7 w-full border border-transparent bg-transparent px-1 text-sm font-semibold outline-none hover:border-line focus:border-accent focus:bg-canvas"
            id="whiteboard-title"
            maxLength={120}
            onBlur={saveTitle}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              setSaveStatus("Local changes");
            }}
            onKeyDown={handleTitleKeyDown}
            value={draftTitle}
          />
          {titleError && (
            <span className="sr-only" role="alert">
              {titleError}
            </span>
          )}
        </form>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <span
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            role="status"
          >
            {saveStatus}
          </span>
          <span
            aria-hidden="true"
            className="hidden items-center gap-1.5 text-xs text-muted md:flex"
          >
            {saveStatus === "Saved locally" ? (
              <Check aria-hidden="true" className="size-3.5" />
            ) : (
              <HardDrive aria-hidden="true" className="size-3.5" />
            )}
            {saveStatus}
          </span>
          <span className="hidden lg:inline-flex">
            <LocalModeBadge />
          </span>
          <button
            aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
            className="grid size-8 place-items-center text-muted transition hover:bg-hover hover:text-ink"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "light" ? (
              <Moon aria-hidden="true" className="size-4" />
            ) : (
              <Sun aria-hidden="true" className="size-4" />
            )}
          </button>
          <button
            className="flex h-8 items-center gap-2 border border-line bg-panel px-3 text-xs font-medium text-muted"
            disabled
            title="Sharing requires a connected account"
            type="button"
          >
            <Share2 aria-hidden="true" className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <details className="relative">
            <summary
              aria-label="Board menu"
              className="grid size-8 cursor-pointer list-none place-items-center text-muted hover:bg-hover hover:text-ink"
            >
              <Ellipsis aria-hidden="true" className="size-4" />
            </summary>
            <div className="absolute right-0 top-10 z-20 w-64 border border-line bg-panel p-3 text-xs shadow-lg">
              <p className="font-medium text-ink">Local board ID</p>
              <p className="mt-1 break-all font-mono text-muted">{board.id}</p>
            </div>
          </details>
        </div>
      </header>

      <div className="relative min-h-0 flex-1" id="main-content" tabIndex={-1}>
        <WhiteboardCanvas boardId={board.id} persistenceKey={persistenceKey} />
      </div>
    </main>
  );
}

interface MissingBoardPageProps {
  reason: string;
}

function MissingBoardPage({ reason }: MissingBoardPageProps) {
  const navigate = useNavigate();

  const createBoard = () => {
    const result = localBoardRepository.createBoard();
    if (!result.ok) {
      console.error(result.error.message);
      return;
    }
    navigate(`/board/${result.value.id}`, { replace: true });
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-ink">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium text-muted">Board unavailable</p>
        <h1 className="mt-2 text-xl font-semibold">Local board not found</h1>
        <p className="mt-2 text-sm leading-6 text-muted">{reason}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Link
            className="inline-flex h-9 items-center border border-line bg-panel px-3 text-sm font-medium hover:bg-hover"
            to="/dashboard"
          >
            Back to dashboard
          </Link>
          <button
            className="h-9 bg-accent px-3 text-sm font-medium text-white hover:bg-accent-strong"
            onClick={createBoard}
            type="button"
          >
            Create new board
          </button>
        </div>
      </div>
    </main>
  );
}

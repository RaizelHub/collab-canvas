import {
  ArrowLeft,
  Check,
  Ellipsis,
  HardDrive,
  HelpCircle,
  LayoutGrid,
  Moon,
  Share2,
  Sparkles,
  Sun,
  Timer,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import type { Editor } from "tldraw";

import { BrandMark } from "../components/brand-mark";
import { KeyboardShortcutsDialog } from "../components/keyboard-shortcuts-dialog";
import { LocalModeBadge } from "../components/local-mode-badge";
import { localBoardRepository } from "../features/boards/local-board-repository";
import { CursorReactions } from "../features/facilitation/cursor-reactions";
import { MeetingTimer } from "../features/facilitation/meeting-timer";
import { BOARD_TEMPLATES } from "../features/templates/templates";
import { TemplatePickerDialog } from "../features/templates/template-picker-dialog";
import { CanvasBackgroundSwitch } from "../features/whiteboard/canvas-background-switch";
import { MiniMap } from "../features/whiteboard/mini-map";
import { tidySelectedShapes, sortSelectedNotesByColor } from "../features/whiteboard/tidy-notes";
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
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const editorRef = useRef<Editor | null>(null);
  const appliedTemplateRef = useRef(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
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

  // Keyboard shortcut listener for '?'
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
          {/* Meeting Timer */}
          <MeetingTimer />

          {/* Canvas Background Grid */}
          <CanvasBackgroundSwitch editor={editorRef.current} />

          {/* Templates Button */}
          <button
            className="flex h-8 items-center gap-1.5 rounded border border-line bg-panel px-2.5 text-xs font-medium text-muted hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setIsTemplatePickerOpen(true)}
            type="button"
          >
            <Sparkles className="size-3.5 text-accent" />
            <span className="hidden sm:inline">Templates</span>
          </button>

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

          {/* Shortcuts Help */}
          <button
            aria-label="Keyboard Shortcuts (?)"
            className="grid size-8 place-items-center rounded text-muted hover:bg-hover hover:text-ink"
            onClick={() => setIsShortcutsOpen(true)}
            title="Keyboard Shortcuts (?)"
            type="button"
          >
            <HelpCircle className="size-4" />
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

              {/* Tidy Shapes actions */}
              <div className="mt-3 border-t border-line pt-3">
                <p className="font-medium text-ink">Layout & Tidy</p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    className="flex h-7 items-center gap-1 rounded border border-line bg-canvas px-2 text-[11px] font-medium text-muted hover:bg-hover hover:text-ink"
                    onClick={() => editorRef.current && tidySelectedShapes(editorRef.current)}
                    type="button"
                  >
                    <LayoutGrid className="size-3" />
                    Tidy into Grid
                  </button>
                  <button
                    className="flex h-7 items-center gap-1 rounded border border-line bg-canvas px-2 text-[11px] font-medium text-muted hover:bg-hover hover:text-ink"
                    onClick={() => editorRef.current && sortSelectedNotesByColor(editorRef.current)}
                    type="button"
                  >
                    Sort by Color
                  </button>
                </div>
              </div>
            </div>
          </details>
        </div>
      </header>

      <div className="relative min-h-0 flex-1" id="main-content" tabIndex={-1}>
        <WhiteboardCanvas
          boardId={board.id}
          onMount={(editor) => {
            editorRef.current = editor;

            // Apply template if navigated from "New from Template"
            const templateId = (location.state as { templateId?: string } | null)?.templateId;
            if (templateId && !appliedTemplateRef.current) {
              appliedTemplateRef.current = true;
              const template = BOARD_TEMPLATES.find((t) => t.id === templateId);
              if (template) {
                setTimeout(() => {
                  if (editor.getCurrentPageShapes().length === 0) {
                    template.apply(editor, 100, 100);
                    editor.zoomToFit({ animation: { duration: 300 } });
                  }
                }, 200);
              }
            }
          }}
          persistenceKey={persistenceKey}
        />
        {/* Live Cursor Reactions */}
        <CursorReactions editor={editorRef.current} />

        {/* MiniMap Radar */}
        <MiniMap editor={editorRef.current} />
      </div>

      <TemplatePickerDialog
        editor={editorRef.current}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      <KeyboardShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
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

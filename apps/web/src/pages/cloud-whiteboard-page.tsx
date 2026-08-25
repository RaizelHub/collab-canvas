import {
  ArrowLeft,
  Check,
  Compass,
  Copy,
  Ellipsis,
  EyeOff,
  FileDown,
  Grid2X2,
  HelpCircle,
  LayoutGrid,
  LoaderCircle,
  Moon,
  RotateCcw,
  Save,
  Share2,
  Sparkles,
  Sun,
  Timer,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, useLocation, useParams } from "react-router";
import { PDFDocument } from "pdf-lib";
import type { Editor } from "tldraw";
import { createUserId } from "@tldraw/tlschema";
import { z } from "zod";

import { AccessibleDialog } from "../components/accessible-dialog";
import { BrandMark } from "../components/brand-mark";
import { KeyboardShortcutsDialog } from "../components/keyboard-shortcuts-dialog";
import { useAuth } from "../features/auth/auth-context";
import {
  createSupabaseBoardRepository,
  type CloudBoard,
} from "../features/boards/supabase-board-repository";
import { CollaboratorMenu } from "../features/collaboration/collaborator-menu";
import {
  arePresenceParticipantsEqual,
  buildPresenceParticipants,
  describePresenceChanges,
  getPresenceChanges,
  type PresenceParticipant,
} from "../features/collaboration/presence";
import { CursorReactions } from "../features/facilitation/cursor-reactions";
import { MeetingTimer } from "../features/facilitation/meeting-timer";
import { BOARD_TEMPLATES } from "../features/templates/templates";
import { TemplatePickerDialog } from "../features/templates/template-picker-dialog";
import { CanvasBackgroundSwitch } from "../features/whiteboard/canvas-background-switch";
import { MiniMap } from "../features/whiteboard/mini-map";
import { tidySelectedShapes, sortSelectedNotesByColor } from "../features/whiteboard/tidy-notes";
import { WhiteboardCanvas } from "../features/whiteboard/whiteboard-canvas";
import { getBoardPersistenceKey } from "../features/whiteboard/persistence-key";
import { createAccessibleBoardHtml } from "../features/whiteboard/accessible-export";
import { useTheme } from "../hooks/use-theme";
import { supabase } from "../lib/supabase";
import { syncServerUrl } from "../lib/env";
import { supabaseTimestampSchema } from "../lib/supabase-timestamp";

const memberRowsSchema = z.array(
  z.object({
    user_id: z.uuid(),
    role: z.enum(["owner", "editor", "viewer"]),
    profiles: z
      .array(z.object({ display_name: z.string().nullable() }))
      .default([]),
  }),
);

const snapshotRowsSchema = z.array(
  z.object({
    id: z.uuid(),
    created_at: supabaseTimestampSchema,
    reason: z.string(),
  }),
);

export function CloudWhiteboardPage() {
  const { boardId } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const repository = useMemo(
    () =>
      supabase && user
        ? createSupabaseBoardRepository(supabase, user.id)
        : null,
    [user],
  );
  const [board, setBoard] = useState<CloudBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [shareOpen, setShareOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "offline"
  >("connecting");
  const [exporting, setExporting] = useState<"html" | "png" | "pdf" | null>(
    null,
  );
  const editorRef = useRef<Editor | null>(null);
  const appliedTemplateRef = useRef(false);
  const collaborationListenerRef = useRef<(() => void) | null>(null);
  const presenceSnapshotRef = useRef<PresenceParticipant[] | null>(null);
  const presenceAnnouncementTimerRef = useRef<number | null>(null);
  const [participants, setParticipants] = useState<PresenceParticipant[]>([]);
  const [presenceAnnouncement, setPresenceAnnouncement] = useState("");
  const [followingParticipant, setFollowingParticipant] = useState<PresenceParticipant | null>(null);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<
    z.infer<typeof snapshotRowsSchema>
  >([]);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<
    { kind: "clear" } | { kind: "restore"; snapshotId: string } | null
  >(null);
  const isCancellingTitleRef = useRef(false);

  const toggleFollowUser = (participant: PresenceParticipant) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (followingParticipant?.id === participant.id) {
      editor.stopFollowingUser();
      setFollowingParticipant(null);
    } else {
      const rawId = participant.id.startsWith("user:")
        ? participant.id.slice(5)
        : participant.id;
      editor.startFollowingUser(createUserId(rawId));
      setFollowingParticipant(participant);
    }
  };

  const stopFollowing = () => {
    editorRef.current?.stopFollowingUser();
    setFollowingParticipant(null);
  };

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

  const loadBoard = useCallback(async () => {
    if (!repository || !boardId) return;
    setLoading(true);
    try {
      const nextBoard = await repository.getById(boardId);
      setBoard(nextBoard);
      setDraftTitle(nextBoard?.title ?? "");
      setError(nextBoard ? null : "You do not have access to this board.");
      if (nextBoard) void repository.markOpened(nextBoard.id);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "The board could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [boardId, repository]);

  useEffect(() => {
    queueMicrotask(() => void loadBoard());
    return () => {
      collaborationListenerRef.current?.();
      collaborationListenerRef.current = null;
      if (presenceAnnouncementTimerRef.current !== null) {
        window.clearTimeout(presenceAnnouncementTimerRef.current);
      }
    };
  }, [loadBoard]);

  useEffect(() => {
    if (board?.title) document.title = `${board.title} — CollabCanvas`;
  }, [board?.title]);

  if (loading) {
    return (
      <main className="grid h-dvh place-items-center bg-canvas text-muted">
        <span className="flex items-center gap-2 text-sm">
          <LoaderCircle className="size-4 animate-spin" />
          Loading board
        </span>
      </main>
    );
  }

  if (!boardId || !board) {
    return (
      <main className="grid h-dvh place-items-center bg-canvas p-6 text-center text-ink">
        <div>
          <h1 className="text-xl font-semibold">Board unavailable</h1>
          <p className="mt-2 text-sm text-muted">
            {error ?? "This board does not exist."}
          </p>
          <Link
            className="mt-5 inline-flex h-9 items-center border border-line bg-panel px-3 text-sm"
            to="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const saveTitle = async () => {
    if (isCancellingTitleRef.current) {
      isCancellingTitleRef.current = false;
      return;
    }
    if (!board.canManage || draftTitle.trim() === board.title) {
      setDraftTitle(board.title);
      setSaveStatus("Saved");
      return;
    }
    setSaveStatus("Saving");
    try {
      const renamed = await repository?.rename(board.id, draftTitle);
      if (renamed) {
        setBoard(renamed);
        setDraftTitle(renamed.title);
      }
      setSaveStatus("Saved");
    } catch (renameError) {
      setError(
        renameError instanceof Error
          ? renameError.message
          : "The title could not be saved.",
      );
      setSaveStatus("Save failed");
    }
  };

  const submitTitle = (event: FormEvent) => {
    event.preventDefault();
    void saveTitle();
  };

  const handleTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      isCancellingTitleRef.current = true;
      setDraftTitle(board.title);
      event.currentTarget.blur();
    }
  };

  const downloadBlob = (blob: Blob, extension: string) => {
    const safeTitle =
      board.title
        .trim()
        .replaceAll(/[^a-zA-Z0-9-_]+/g, "-")
        .replaceAll(/^-+|-+$/g, "")
        .slice(0, 80) || "board";
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeTitle}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const exportBoard = async (format: "png" | "pdf") => {
    const editor = editorRef.current;
    if (!editor || exporting) return;
    const selected = editor.getSelectedShapes();
    const shapes =
      selected.length > 0 ? selected : editor.getCurrentPageShapes();
    if (shapes.length === 0) {
      setError("Add at least one object before exporting.");
      return;
    }
    setExporting(format);
    setError(null);
    try {
      const image = await editor.toImage(shapes, {
        background: true,
        format: "png",
        padding: 32,
        scale: 2,
      });
      if (format === "png") {
        downloadBlob(image.blob, "png");
      } else {
        const pdf = await PDFDocument.create();
        const embedded = await pdf.embedPng(await image.blob.arrayBuffer());
        const page = pdf.addPage([image.width, image.height]);
        page.drawImage(embedded, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        });
        downloadBlob(
          new Blob([await pdf.save()], { type: "application/pdf" }),
          "pdf",
        );
      }
    } catch (exportError) {
      console.error("Board export failed.", exportError);
      setError("The board could not be exported.");
    } finally {
      setExporting(null);
    }
  };

  const exportAccessibleBoard = () => {
    const editor = editorRef.current;
    if (!editor || exporting) return;
    setExporting("html");
    setError(null);
    try {
      const html = createAccessibleBoardHtml(
        board.title,
        editor.getCurrentPageShapes(),
      );
      downloadBlob(
        new Blob([html], { type: "text/html;charset=utf-8" }),
        "html",
      );
    } catch (exportError) {
      console.error("Accessible board export failed.", exportError);
      setError("The accessible board companion could not be exported.");
    } finally {
      setExporting(null);
    }
  };

  const loadSnapshots = async () => {
    if (!supabase || !board.canManage) return;
    const { data, error: snapshotError } = await supabase
      .from("board_snapshots")
      .select("id,created_at,reason")
      .eq("board_id", board.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (snapshotError) {
      console.error("Snapshots could not be loaded.", snapshotError);
      setError("Snapshots could not be loaded.");
      return;
    }
    const parsed = snapshotRowsSchema.safeParse(data ?? []);
    if (parsed.success) setSnapshots(parsed.data);
  };

  const workerRequest = async (path: string) => {
    if (!supabase || !syncServerUrl) {
      throw new Error("The sync worker is not configured.");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      throw new Error("Your session expired. Sign in again.");
    }
    return fetch(`${syncServerUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ reason: "Manual snapshot" }),
    });
  };

  const createSnapshot = async () => {
    if (snapshotBusy) return;
    setSnapshotBusy(true);
    try {
      const response = await workerRequest(`/boards/${board.id}/snapshots`);
      if (!response.ok) throw new Error("Snapshot creation failed.");
      await loadSnapshots();
      setError(null);
    } catch (snapshotError) {
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "Snapshot creation failed.",
      );
    } finally {
      setSnapshotBusy(false);
    }
  };

  const restoreSnapshot = async (snapshotId: string) => {
    if (snapshotBusy) return;
    setSnapshotBusy(true);
    try {
      const response = await workerRequest(
        `/boards/${board.id}/snapshots/${snapshotId}/restore`,
      );
      if (!response.ok) throw new Error("Snapshot restore failed.");
      window.location.reload();
    } catch (snapshotError) {
      setError(
        snapshotError instanceof Error
          ? snapshotError.message
          : "Snapshot restore failed.",
      );
      setSnapshotBusy(false);
    }
  };
  const syncStatus =
    connectionStatus === "connected"
      ? saveStatus
      : connectionStatus === "offline"
        ? "Offline"
        : "Connecting";

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
          className="grid size-8 place-items-center text-muted hover:bg-hover"
          to="/dashboard"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <BrandMark />
        <form className="min-w-0 max-w-64 flex-1" onSubmit={submitTitle}>
          <label className="sr-only" htmlFor="whiteboard-title">
            Board title
          </label>
          <input
            className="h-7 w-full border border-transparent bg-transparent px-1 text-sm font-semibold outline-none hover:border-line focus:border-accent"
            disabled={!board.canManage}
            id="whiteboard-title"
            maxLength={120}
            onBlur={() => void saveTitle()}
            onChange={(event) => {
              setDraftTitle(event.target.value);
              setSaveStatus("Unsaved");
            }}
            onKeyDown={handleTitleKeyDown}
            value={draftTitle}
          />
        </form>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            aria-atomic="true"
            aria-live="polite"
            className="sr-only"
            role="status"
          >
            {syncStatus}
          </span>
          <span
            aria-hidden="true"
            className="hidden items-center gap-1 text-xs text-muted md:flex"
          >
            <Check className="size-3.5" />
            {syncStatus}
          </span>

          {/* Meeting Timer */}
          <MeetingTimer />

          {/* Canvas Background / Grid */}
          <CanvasBackgroundSwitch editor={editorRef.current} />

          {/* Templates Picker Button */}
          <button
            className="flex h-8 items-center gap-1.5 rounded border border-line bg-panel px-2.5 text-xs font-medium text-muted hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
            onClick={() => setIsTemplatePickerOpen(true)}
            type="button"
          >
            <Sparkles className="size-3.5 text-accent" />
            <span className="hidden sm:inline">Templates</span>
          </button>

          <CollaboratorMenu
            followingUserId={followingParticipant?.id}
            onToggleFollow={toggleFollowUser}
            participants={participants}
            role={board.role}
          />
          <button
            aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
            className="grid size-8 place-items-center text-muted hover:bg-hover"
            onClick={toggleTheme}
            type="button"
          >
            {theme === "light" ? (
              <Moon className="size-4" />
            ) : (
              <Sun className="size-4" />
            )}
          </button>
          {board.canManage && (
            <button
              className="flex h-8 items-center gap-2 border border-line bg-panel px-3 text-xs font-medium"
              onClick={() => setShareOpen(true)}
              type="button"
            >
              <Share2 className="size-3.5" />
              Share
            </button>
          )}
          <details className="relative">
            <summary className="flex h-8 cursor-pointer list-none items-center gap-2 border border-line px-3 text-xs font-medium">
              <FileDown className="size-3.5" />
              Export
            </summary>
            <div className="absolute right-0 top-10 z-20 w-44 border border-line bg-panel p-1 shadow-lg">
              <button
                className="h-9 w-full px-3 text-left text-sm hover:bg-hover"
                disabled={exporting !== null}
                onClick={() => void exportBoard("png")}
                type="button"
              >
                {exporting === "png" ? "Exporting PNG…" : "Export visual PNG"}
              </button>
              <button
                className="h-9 w-full px-3 text-left text-sm hover:bg-hover"
                disabled={exporting !== null}
                onClick={() => void exportBoard("pdf")}
                type="button"
              >
                {exporting === "pdf" ? "Exporting PDF…" : "Export visual PDF"}
              </button>
              <button
                className="h-9 w-full px-3 text-left text-sm hover:bg-hover"
                disabled={exporting !== null}
                onClick={exportAccessibleBoard}
                type="button"
              >
                {exporting === "html"
                  ? "Exporting companion…"
                  : "Export accessible HTML"}
              </button>
            </div>
          </details>

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
              className="grid size-8 cursor-pointer list-none place-items-center text-muted hover:bg-hover"
            >
              <Ellipsis className="size-4" />
            </summary>
            <div className="absolute right-0 top-10 z-20 w-72 border border-line bg-panel p-3 text-xs shadow-lg">
              <p className="font-medium">Board ID</p>
              <p className="mt-1 break-all font-mono text-muted">{board.id}</p>

              {/* Tidy Shapes actions */}
              <div className="mt-3 border-t border-line pt-3">
                <p className="font-medium">Layout & Tidy</p>
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

              {board.canManage && (
                <div className="mt-3 border-t border-line pt-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Snapshots</p>
                    <button
                      className="flex h-7 items-center gap-1 border border-line px-2 font-medium"
                      disabled={snapshotBusy}
                      onClick={() => void createSnapshot()}
                      type="button"
                    >
                      <Save className="size-3" />
                      Save
                    </button>
                  </div>
                  <button
                    className="mt-2 text-muted underline"
                    onClick={() => void loadSnapshots()}
                    type="button"
                  >
                    Refresh snapshot list
                  </button>
                  <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
                    {snapshots.map((snapshot) => (
                      <li
                        className="flex items-center gap-2 border-t border-line py-2"
                        key={snapshot.id}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            {snapshot.reason}
                          </span>
                          <span className="text-muted">
                            {new Date(snapshot.created_at).toLocaleString()}
                          </span>
                        </span>
                        <button
                          aria-label={`Restore snapshot from ${new Date(snapshot.created_at).toLocaleString()}`}
                          className="grid size-7 place-items-center hover:bg-hover"
                          disabled={snapshotBusy}
                          onClick={() =>
                            setConfirmation({
                              kind: "restore",
                              snapshotId: snapshot.id,
                            })
                          }
                          type="button"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  {board.role !== "viewer" && (
                    <button
                      className="mt-3 h-8 w-full border border-danger px-2 text-left font-medium text-danger"
                      onClick={() => setConfirmation({ kind: "clear" })}
                      type="button"
                    >
                      Clear board…
                    </button>
                  )}
                </div>
              )}
            </div>
          </details>
        </div>
      </header>
      {error && (
        <p
          className="border-b border-danger bg-danger-soft px-4 py-2 text-xs"
          role="alert"
        >
          {error}
        </p>
      )}
      {presenceAnnouncement && (
        <p
          aria-live="polite"
          className="absolute right-4 top-16 z-30 border border-line bg-panel px-3 py-2 text-xs shadow-lg"
          role="status"
        >
          {presenceAnnouncement}
        </p>
      )}
      {followingParticipant && (
        <div className="absolute left-1/2 top-14 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent bg-panel/95 px-3.5 py-1 text-xs shadow-lg backdrop-blur-sm">
          <span className="size-2 animate-ping rounded-full bg-accent" />
          <span>
            Following <strong>{followingParticipant.name}</strong>
          </span>
          <button
            className="flex items-center gap-1 rounded bg-hover px-2 py-0.5 font-medium text-ink hover:bg-line"
            onClick={stopFollowing}
            type="button"
          >
            <EyeOff className="size-3" /> Stop
          </button>
        </div>
      )}
      <div className="relative min-h-0 flex-1" id="main-content" tabIndex={-1}>
        <WhiteboardCanvas
          boardId={board.id}
          onConnectionStatus={setConnectionStatus}
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

            const updateParticipants = () => {
              const nextParticipants = buildPresenceParticipants(
                {
                  color: "#2563eb",
                  id: `user:${user?.id ?? "current"}`,
                  name:
                    user?.user_metadata.display_name?.toString() ??
                    user?.email?.split("@")[0] ??
                    "You",
                },
                editor.getCollaborators(),
              );
              const previousParticipants = presenceSnapshotRef.current;
              if (
                previousParticipants &&
                arePresenceParticipantsEqual(
                  previousParticipants,
                  nextParticipants,
                )
              ) {
                return;
              }
              presenceSnapshotRef.current = nextParticipants;
              setParticipants(nextParticipants);

              if (previousParticipants) {
                const announcement = describePresenceChanges(
                  getPresenceChanges(previousParticipants, nextParticipants),
                );
                if (announcement) {
                  setPresenceAnnouncement(announcement);
                  if (presenceAnnouncementTimerRef.current !== null) {
                    window.clearTimeout(presenceAnnouncementTimerRef.current);
                  }
                  presenceAnnouncementTimerRef.current = window.setTimeout(
                    () => setPresenceAnnouncement(""),
                    4_000,
                  );
                }
              }
            };
            updateParticipants();
            collaborationListenerRef.current?.();
            collaborationListenerRef.current = editor.store.listen(
              updateParticipants,
              { scope: "all" },
            );
          }}
          persistenceKey={getBoardPersistenceKey(board.id)}
        />
        {/* Live Cursor Reactions & Laser Pointer */}
        <CursorReactions editor={editorRef.current} />

        {/* Canvas Mini-Map Navigator */}
        <MiniMap editor={editorRef.current} />
      </div>
      {shareOpen && (
        <ShareBoardDialog
          board={board}
          onClose={() => setShareOpen(false)}
          onUpdated={setBoard}
        />
      )}
      <TemplatePickerDialog
        editor={editorRef.current}
        isOpen={isTemplatePickerOpen}
        onClose={() => setIsTemplatePickerOpen(false)}
      />
      <KeyboardShortcutsDialog
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      {confirmation && (
        <ConfirmBoardActionDialog
          action={confirmation.kind}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            if (confirmation.kind === "clear") {
              const editor = editorRef.current;
              if (editor) {
                editor.deleteShapes(
                  editor.getCurrentPageShapes().map((shape) => shape.id),
                );
              }
              setConfirmation(null);
            } else {
              const snapshotId = confirmation.snapshotId;
              setConfirmation(null);
              void restoreSnapshot(snapshotId);
            }
          }}
        />
      )}
    </main>
  );
}

function ConfirmBoardActionDialog({
  action,
  onCancel,
  onConfirm,
}: {
  action: "clear" | "restore";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const title =
    action === "clear" ? "Clear this board?" : "Restore this snapshot?";
  const description =
    action === "clear"
      ? "Every object on the current page will be deleted. You can undo while this session remains open."
      : "Current board content will be replaced with the saved snapshot.";

  return (
    <AccessibleDialog
      description={description}
      initialFocusRef={cancelRef}
      onClose={onCancel}
      panelClassName="max-w-sm"
      title={title}
    >
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="h-9 border border-line px-3 text-sm font-medium"
          onClick={onCancel}
          ref={cancelRef}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-9 bg-danger px-3 text-sm font-medium text-white"
          onClick={onConfirm}
          type="button"
        >
          {action === "clear" ? "Clear board" : "Restore snapshot"}
        </button>
      </div>
    </AccessibleDialog>
  );
}

function ShareBoardDialog({
  board,
  onClose,
  onUpdated,
}: {
  board: CloudBoard;
  onClose: () => void;
  onUpdated: (board: CloudBoard) => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<
    Array<{
      user_id: string;
      role: "owner" | "editor" | "viewer";
      profiles: { display_name: string | null } | null;
    }>
  >([]);

  const loadMembers = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("board_members")
      .select("user_id,role,profiles(display_name)")
      .eq("board_id", board.id)
      .order("joined_at");
    if (error) {
      console.error("Board members could not be loaded.", error);
      setStatus("Board members could not be loaded.");
      return;
    }
    const parsed = memberRowsSchema.safeParse(data ?? []);
    if (!parsed.success) {
      console.error("Board member data was malformed.", parsed.error);
      setStatus("Board members could not be loaded.");
      return;
    }
    setMembers(
      parsed.data.map((member) => ({
        user_id: member.user_id,
        role: member.role,
        profiles: member.profiles[0] ?? null,
      })),
    );
  }, [board.id]);

  useEffect(() => {
    queueMicrotask(() => void loadMembers());
  }, [loadMembers]);

  const changeVisibility = async (visibility: CloudBoard["visibility"]) => {
    if (!supabase || !user) return;
    setStatus("Saving…");
    const { data, error } = await supabase
      .from("boards")
      .update({ visibility })
      .eq("id", board.id)
      .select(
        "id,title,created_at,updated_at,last_activity_at,owner_id,visibility",
      )
      .single();
    if (error) {
      console.error("Board sharing setting could not be saved.", error);
      setStatus("Sharing setting could not be saved.");
      return;
    }
    const repository = createSupabaseBoardRepository(supabase, user.id);
    const updated = await repository.getById(data.id);
    if (updated) onUpdated(updated);
    if (visibility === "private") {
      await updateShareLink("DELETE");
      setShareUrl(null);
    } else if (visibility === "link_viewer" || visibility === "link_editor") {
      await updateShareLink("POST");
    }
    setStatus("Sharing setting saved.");
  };

  const updateShareLink = async (method: "POST" | "DELETE") => {
    if (!supabase || !syncServerUrl) {
      setStatus("The sync worker is required for share links.");
      return;
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) {
      setStatus("Your session expired. Sign in again.");
      return;
    }
    const response = await fetch(
      `${syncServerUrl}/boards/${board.id}/share-link`,
      {
        method,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      },
    );
    if (!response.ok) {
      setStatus("The share link could not be updated.");
      return;
    }
    if (method === "POST") {
      const result = (await response.json()) as { token?: string };
      if (result.token) {
        setShareUrl(`${window.location.origin}/share/${result.token}`);
      }
    } else {
      setShareUrl(null);
    }
  };

  const createInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !syncServerUrl || !email.trim()) {
      setStatus("The sync worker URL is required to create invitations.");
      return;
    }
    setStatus("Creating invitation…");
    setInviteUrl(null);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      setStatus("Your session expired. Sign in again.");
      return;
    }
    const response = await fetch(
      `${syncServerUrl}/boards/${board.id}/invitations`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          role: inviteRole,
          expiresInDays: 7,
        }),
      },
    );
    const result = (await response.json()) as {
      error?: string;
      token?: string;
    };
    if (!response.ok || !result.token) {
      setStatus(result.error ?? "Invitation could not be created.");
      return;
    }
    setInviteUrl(`${window.location.origin}/invite/${result.token}`);
    setEmail("");
    setStatus("Invitation created. It expires in 7 days.");
  };

  const changeMemberRole = async (
    memberId: string,
    role: "editor" | "viewer",
  ) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("board_members")
      .update({ role })
      .eq("board_id", board.id)
      .eq("user_id", memberId);
    if (error) {
      console.error("Member role could not be updated.", error);
      setStatus("Member role could not be updated.");
      return;
    }
    setStatus("Member role updated.");
    await loadMembers();
  };

  const removeMember = async (memberId: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("board_members")
      .delete()
      .eq("board_id", board.id)
      .eq("user_id", memberId);
    if (error) {
      console.error("Member could not be removed.", error);
      setStatus("Member could not be removed.");
      return;
    }
    setStatus("Member removed.");
    await loadMembers();
  };

  return (
    <AccessibleDialog
      description="Choose who can discover and open this board."
      onClose={onClose}
      title="Share board"
    >
      <div>
        <label className="mt-5 block text-sm font-medium">
          Access
          <select
            className="mt-1.5 h-10 w-full border border-line bg-canvas px-3 font-normal"
            onChange={(event) =>
              void changeVisibility(
                event.target.value as CloudBoard["visibility"],
              )
            }
            value={board.visibility}
          >
            <option value="private">Private — members only</option>
            <option value="link_viewer">Link — view only</option>
            <option value="link_editor">Link — can edit</option>
            <option value="public_viewer">Public — view only</option>
          </select>
        </label>
        {(board.visibility === "link_viewer" ||
          board.visibility === "link_editor") && (
          <div className="mt-3 border border-line bg-canvas p-2">
            {shareUrl ? (
              <div className="flex items-center gap-2">
                <input
                  aria-label="Board share link"
                  className="min-w-0 flex-1 bg-transparent text-xs"
                  readOnly
                  value={shareUrl}
                />
                <button
                  aria-label="Copy board share link"
                  className="grid size-8 place-items-center hover:bg-hover"
                  onClick={() => void navigator.clipboard.writeText(shareUrl)}
                  type="button"
                >
                  <Copy className="size-4" />
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted">
                Generate a new link to share this access level.
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                className="h-8 border border-line px-2 text-xs font-medium"
                onClick={() => void updateShareLink("POST")}
                type="button"
              >
                {shareUrl ? "Regenerate link" : "Generate link"}
              </button>
              {shareUrl && (
                <button
                  className="h-8 px-2 text-xs font-medium text-danger"
                  onClick={() => void updateShareLink("DELETE")}
                  type="button"
                >
                  Revoke link
                </button>
              )}
            </div>
          </div>
        )}
        <form
          className="mt-5 border-t border-line pt-5"
          onSubmit={createInvite}
        >
          <p className="text-sm font-medium">Invite collaborator</p>
          <div className="mt-2 flex gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Email address</span>
              <input
                className="h-10 w-full border border-line bg-canvas px-3 text-sm"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              <span className="sr-only">Invitation role</span>
              <select
                className="h-10 border border-line bg-canvas px-2 text-sm"
                onChange={(event) =>
                  setInviteRole(event.target.value as "editor" | "viewer")
                }
                value={inviteRole}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
            <button
              className="h-10 bg-accent px-3 text-sm font-medium text-white"
              type="submit"
            >
              Invite
            </button>
          </div>
        </form>
        {inviteUrl && (
          <div className="mt-3 flex items-center gap-2 border border-line bg-canvas p-2">
            <input
              aria-label="Invitation link"
              className="min-w-0 flex-1 bg-transparent text-xs"
              readOnly
              value={inviteUrl}
            />
            <button
              aria-label="Copy invitation link"
              className="grid size-8 place-items-center hover:bg-hover"
              onClick={() => void navigator.clipboard.writeText(inviteUrl)}
              type="button"
            >
              <Copy className="size-4" />
            </button>
          </div>
        )}
        <div className="mt-5 border-t border-line pt-5">
          <p className="text-sm font-medium">People with access</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
            {members.map((member) => (
              <li
                className="flex items-center gap-2 py-1.5 text-sm"
                key={member.user_id}
              >
                <span className="min-w-0 flex-1 truncate">
                  {member.profiles?.display_name ?? "Collaborator"}
                  {member.user_id === user?.id ? " (you)" : ""}
                </span>
                {member.role === "owner" ? (
                  <span className="text-xs text-muted">Owner</span>
                ) : (
                  <>
                    <select
                      aria-label={`Role for ${member.profiles?.display_name ?? "collaborator"}`}
                      className="h-8 border border-line bg-canvas px-2 text-xs"
                      onChange={(event) =>
                        void changeMemberRole(
                          member.user_id,
                          event.target.value as "editor" | "viewer",
                        )
                      }
                      value={member.role}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <button
                      aria-label={`Remove ${member.profiles?.display_name ?? "collaborator"}`}
                      className="grid size-8 place-items-center text-muted hover:bg-danger-soft hover:text-danger"
                      onClick={() => void removeMember(member.user_id)}
                      type="button"
                    >
                      <X className="size-4" />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
        {status && (
          <p aria-live="polite" className="mt-3 text-xs text-muted">
            {status}
          </p>
        )}
        <div className="mt-5 flex justify-end">
          <button
            className="h-9 border border-line px-3 text-sm font-medium"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </AccessibleDialog>
  );
}

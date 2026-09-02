import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";

import {
  REACTION_CONFIG,
  type ReactionKind,
} from "./reaction-constants";

interface Reaction {
  id: string;
  kind: ReactionKind;
  x: number;
  y: number;
}

interface CursorReactionsProps {
  editor?: Editor | null;
  hideToolbar?: boolean;
}

export function CursorReactions({ editor, hideToolbar = false }: CursorReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const reactionCounterRef = useRef(0);

  const triggerReaction = useCallback((kind: ReactionKind, point?: { x: number; y: number }) => {
    let x = point?.x ?? window.innerWidth / 2;
    let y = point?.y ?? window.innerHeight / 2;

    if (!point && editor) {
      const screenBounds = editor.getViewportScreenBounds();
      const pointer = editor.inputs.currentScreenPoint;
      if (pointer.x > 0 && pointer.y > 0) {
        x = pointer.x;
        y = pointer.y;
      } else {
        x = screenBounds.w / 2;
        y = screenBounds.h / 2;
      }
    }

    reactionCounterRef.current += 1;
    const count = reactionCounterRef.current;
    const id = `reaction-${count}`;
    const offsetX = (count % 7) * 6 - 18;
    const offsetY = (count % 5) * 4 - 10;

    const newReaction: Reaction = {
      id,
      kind,
      x: x + offsetX,
      y: y + offsetY,
    };

    setReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  }, [editor]);

  useEffect(() => {
    const handleEvent = (event: Event) => {
      const custom = event as CustomEvent<{ kind: ReactionKind; point?: { x: number; y: number } }>;
      if (custom.detail?.kind) {
        triggerReaction(custom.detail.kind, custom.detail.point);
      }
    };
    window.addEventListener("collab-canvas-reaction", handleEvent);
    return () => window.removeEventListener("collab-canvas-reaction", handleEvent);
  }, [triggerReaction]);

  const toggleLaserPointer = () => {
    if (!editor) return;
    if (editor.getCurrentToolId() === "laser") {
      editor.setCurrentTool("select");
      setIsLaserActive(false);
    } else {
      editor.setCurrentTool("laser");
      setIsLaserActive(true);
    }
  };

  // Sync laser active state with editor tool changes
  useEffect(() => {
    if (!editor) return;
    const cleanup = editor.sideEffects.registerAfterChangeHandler(
      "instance",
      () => {
        setIsLaserActive(editor.getCurrentToolId() === "laser");
      },
    );
    return () => cleanup();
  }, [editor]);

  return (
    <>
      {/* Floating Reaction Icons Layer */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {reactions.map((r) => {
          const cfg = REACTION_CONFIG[r.kind];
          const Icon = cfg.icon;
          return (
            <div
              className="animate-reaction absolute select-none"
              key={r.id}
              style={{
                left: `${r.x}px`,
                top: `${r.y}px`,
              }}
            >
              <div
                className={`grid size-10 place-items-center rounded-full border shadow-lg backdrop-blur-md ${cfg.bg}`}
              >
                <Icon className={`size-5 ${cfg.color}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Facilitator Quick Reaction Bar */}
      {!hideToolbar && (
        <div className="fixed bottom-14 left-1/2 z-30 -translate-x-1/2 rounded-full border border-line bg-panel/95 px-2 py-1 shadow-xl backdrop-blur-md transition-all sm:bottom-6">
          <div className="flex items-center gap-1">
            {(Object.keys(REACTION_CONFIG) as ReactionKind[]).map((kind) => {
              const { icon: Icon, label, color } = REACTION_CONFIG[kind];
              return (
                <button
                  aria-label={`Send ${label} reaction`}
                  className="grid size-8 place-items-center rounded-full transition-transform hover:scale-125 hover:bg-hover active:scale-95"
                  key={kind}
                  onClick={() => triggerReaction(kind)}
                  type="button"
                >
                  <Icon className={`size-4 ${color}`} />
                </button>
              );
            })}

            <div className="mx-1 h-4 w-px bg-line" />

            {/* Laser pointer button */}
            <button
              aria-label={isLaserActive ? "Disable Laser Pointer" : "Enable Laser Pointer"}
              className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors ${
                isLaserActive
                  ? "bg-danger text-white ring-2 ring-danger/40"
                  : "border border-line bg-canvas text-muted hover:bg-hover hover:text-ink"
              }`}
              onClick={toggleLaserPointer}
              title="Laser pointer for presentations"
              type="button"
            >
              <span className="size-2 rounded-full bg-danger animate-pulse" />
              <span>Laser</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

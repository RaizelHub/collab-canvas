import { useEffect, useState } from "react";
import { Flame, Heart, Lightbulb, PartyPopper, Rocket, ThumbsUp } from "lucide-react";
import type { Editor } from "tldraw";

interface Reaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

interface CursorReactionsProps {
  editor?: Editor | null;
}

export function CursorReactions({ editor }: CursorReactionsProps) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [isLaserActive, setIsLaserActive] = useState(false);

  const emojiList = [
    { emoji: "❤️", icon: Heart, label: "Heart" },
    { emoji: "🎉", icon: PartyPopper, label: "Celebrate" },
    { emoji: "🔥", icon: Flame, label: "Fire" },
    { emoji: "👍", icon: ThumbsUp, label: "Thumbs Up" },
    { emoji: "💡", icon: Lightbulb, label: "Idea" },
    { emoji: "🚀", icon: Rocket, label: "Launch" },
  ];

  const triggerReaction = (emoji: string) => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    if (editor) {
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

    const id = Math.random().toString(36).substring(2, 9);
    const newReaction: Reaction = {
      id,
      emoji,
      x: x + (Math.random() * 40 - 20),
      y: y + (Math.random() * 20 - 10),
    };

    setReactions((prev) => [...prev, newReaction]);

    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
    }, 2000);
  };

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
      {/* Floating Emojis Layer */}
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {reactions.map((r) => (
          <div
            className="animate-reaction absolute text-3xl select-none"
            key={r.id}
            style={{
              left: `${r.x}px`,
              top: `${r.y}px`,
            }}
          >
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Facilitator Quick Reaction Bar */}
      <div className="fixed bottom-14 left-1/2 z-30 -translate-x-1/2 rounded-full border border-line bg-panel/95 px-2 py-1 shadow-xl backdrop-blur-md transition-all sm:bottom-6">
        <div className="flex items-center gap-1">
          {emojiList.map(({ emoji, label }) => (
            <button
              aria-label={`Send ${label} reaction`}
              className="grid size-8 place-items-center rounded-full text-base transition-transform hover:scale-125 hover:bg-hover active:scale-95"
              key={label}
              onClick={() => triggerReaction(emoji)}
              type="button"
            >
              {emoji}
            </button>
          ))}

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
    </>
  );
}

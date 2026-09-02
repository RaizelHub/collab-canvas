import {
  Award,
  CheckCircle2,
  Flame,
  Heart,
  Lightbulb,
  RotateCcw,
  Star,
  ThumbsUp,
  Vote,
  X,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import type { Editor, TLShape } from "tldraw";

interface DotVotingProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

type VoteType = "thumbs" | "fire" | "bulb" | "star" | "heart";

const VOTE_OPTIONS: {
  id: VoteType;
  label: string;
  icon: ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: "thumbs", label: "Thumbs Up", icon: ThumbsUp, color: "text-blue-500" },
  { id: "fire", label: "High Priority", icon: Flame, color: "text-orange-500" },
  { id: "bulb", label: "Great Idea", icon: Lightbulb, color: "text-yellow-500" },
  { id: "star", label: "Favorite", icon: Star, color: "text-amber-500" },
  { id: "heart", label: "Love", icon: Heart, color: "text-pink-500" },
];

function VoteBadgeIcon({ type }: { type: string }) {
  switch (type) {
    case "fire":
      return <Flame className="size-3 text-orange-500" />;
    case "bulb":
      return <Lightbulb className="size-3 text-yellow-500" />;
    case "star":
      return <Star className="size-3 text-amber-500" />;
    case "heart":
      return <Heart className="size-3 text-pink-500" />;
    case "thumbs":
    default:
      return <ThumbsUp className="size-3 text-blue-500" />;
  }
}

export function DotVoting({ editor, isOpen, onClose }: DotVotingProps) {
  const [selectedShapes, setSelectedShapes] = useState<TLShape[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, { count: number; text: string; type: string }>>({});
  const [lastVotedId, setLastVotedId] = useState<string | null>(null);

  // Sync selected shapes and calculate vote tally from shapes on board
  useEffect(() => {
    if (!editor) return;

    const updateFromCanvas = () => {
      const selected = editor.getSelectedShapes();
      setSelectedShapes(selected);

      // Tally votes from shapes with meta.votes
      const allShapes = editor.getCurrentPageShapes();
      const tally: Record<string, { count: number; text: string; type: string }> = {};

      allShapes.forEach((shape) => {
        const meta = shape.meta as { votes?: number; voteType?: string } | undefined;
        if (meta?.votes && meta.votes > 0) {
          let text = "Selected Item";
          if ("props" in shape && typeof shape.props === "object" && shape.props) {
            const props = shape.props as { text?: string; richText?: { text?: string } };
            text = props.richText?.text || props.text || "Shape";
          }
          tally[shape.id] = {
            count: meta.votes,
            text: text.slice(0, 50),
            type: meta.voteType || "thumbs",
          };
        }
      });

      setVoteCounts(tally);
    };

    updateFromCanvas();
    const unlisten = editor.store.listen(updateFromCanvas, {
      source: "all",
      scope: "document",
    });

    return () => unlisten();
  }, [editor, isOpen]);

  const castVote = (type: VoteType) => {
    if (!editor) return;
    const selected = editor.getSelectedShapes();
    if (selected.length === 0) return;

    selected.forEach((shape) => {
      const currentMeta = (shape.meta as { votes?: number; voteType?: string }) || {};
      const newVotes = (currentMeta.votes || 0) + 1;

      editor.updateShape({
        id: shape.id,
        type: shape.type,
        meta: {
          ...currentMeta,
          votes: newVotes,
          voteType: type,
        },
      });

      // Animate vote badge placement on canvas next to shape
      const bounds = editor.getShapePageBounds(shape.id);
      if (bounds) {
        setLastVotedId(shape.id);
        setTimeout(() => setLastVotedId(null), 1200);
      }
    });
  };

  const clearVotes = () => {
    if (!editor) return;
    const allShapes = editor.getCurrentPageShapes();
    allShapes.forEach((shape) => {
      const meta = shape.meta as { votes?: number; voteType?: string } | undefined;
      if (meta?.votes) {
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          meta: {
            ...meta,
            votes: 0,
            voteType: undefined,
          },
        });
      }
    });
    setVoteCounts({});
  };

  if (!isOpen) return null;

  const sortedLeaderboard = Object.entries(voteCounts).sort(
    ([, a], [, b]) => b.count - a.count,
  );

  return (
    <div className="fixed left-4 top-16 z-40 w-84 max-w-[calc(100vw-2rem)] rounded-2xl border-2 border-line bg-panel p-4 shadow-2xl backdrop-blur-md neo-box-shadow animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-accent/10 text-accent">
            <Vote className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink">Agile Dot Voting</h3>
            <p className="text-[11px] text-muted">Cast votes on sticky notes &amp; ideas</p>
          </div>
        </div>
        <button
          aria-label="Close voting panel"
          className="grid size-8 place-items-center rounded-xl text-muted hover:bg-hover hover:text-ink transition"
          onClick={onClose}
          type="button"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {/* Voting Action Section */}
        <div className="rounded-xl border border-line/80 bg-canvas/60 p-3">
          <p className="text-xs font-medium text-ink">
            {selectedShapes.length > 0 ? (
              <span className="text-accent font-semibold flex items-center gap-1">
                <CheckCircle2 className="size-3.5" />
                Voting on {selectedShapes.length} selected item{selectedShapes.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-muted">
                Select any sticky note or shape on the canvas, then vote:
              </span>
            )}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {VOTE_OPTIONS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  className="flex h-9 items-center gap-1.5 rounded-xl border border-line bg-panel px-3 text-xs font-semibold hover:border-accent hover:bg-hover active:scale-95 transition disabled:opacity-50"
                  disabled={selectedShapes.length === 0}
                  key={v.id}
                  onClick={() => castVote(v.id)}
                  title={v.label}
                  type="button"
                >
                  <Icon className={`size-3.5 ${v.color}`} />
                  <span>+1</span>
                </button>
              );
            })}
          </div>
          {lastVotedId && (
            <p className="mt-2 text-[11px] font-medium text-emerald-500 animate-pulse">
              ✓ Vote recorded!
            </p>
          )}
        </div>

        {/* Leaderboard / Tally Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Award className="size-3.5 text-amber-500" />
              <span>Top Voted Items</span>
            </div>
            {sortedLeaderboard.length > 0 && (
              <button
                className="text-[11px] text-muted hover:text-danger flex items-center gap-1 transition"
                onClick={clearVotes}
                type="button"
              >
                <RotateCcw className="size-3" />
                Reset all
              </button>
            )}
          </div>

          <div className="mt-2 max-h-48 overflow-y-auto space-y-1.5">
            {sortedLeaderboard.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">
                No votes cast yet. Select a sticky note and drop a vote!
              </p>
            ) : (
              sortedLeaderboard.map(([id, item], index) => (
                <div
                  className="flex items-center justify-between rounded-xl border border-line/60 bg-canvas/80 px-3 py-1.5 text-xs"
                  key={id}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <span className="font-mono font-bold text-accent text-[11px]">
                      #{index + 1}
                    </span>
                    <span className="truncate text-ink font-medium">{item.text || "Sticky Note"}</span>
                  </div>
                  <span className="shrink-0 font-mono font-semibold rounded-lg bg-panel px-2 py-0.5 border border-line flex items-center gap-1 text-[11px]">
                    <VoteBadgeIcon type={item.type} />
                    <span>{item.count}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-white hover:bg-accent-strong shadow-md transition"
            onClick={onClose}
            type="button"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

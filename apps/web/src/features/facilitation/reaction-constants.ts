import type { ComponentType } from "react";
import {
  Flame,
  Heart,
  Lightbulb,
  PartyPopper,
  Rocket,
  ThumbsUp,
} from "lucide-react";

export type ReactionKind =
  | "heart"
  | "celebrate"
  | "fire"
  | "thumbs"
  | "bulb"
  | "rocket";

export function triggerCanvasReaction(
  kind: ReactionKind,
  point?: { x: number; y: number },
) {
  window.dispatchEvent(
    new CustomEvent("collab-canvas-reaction", { detail: { kind, point } }),
  );
}

export const REACTION_CONFIG: Record<
  ReactionKind,
  {
    icon: ComponentType<{ className?: string }>;
    label: string;
    color: string;
    bg: string;
  }
> = {
  heart: {
    icon: Heart,
    label: "Heart",
    color: "text-pink-500",
    bg: "bg-pink-500/15 border-pink-500/30",
  },
  celebrate: {
    icon: PartyPopper,
    label: "Celebrate",
    color: "text-amber-500",
    bg: "bg-amber-500/15 border-amber-500/30",
  },
  fire: {
    icon: Flame,
    label: "Fire",
    color: "text-orange-500",
    bg: "bg-orange-500/15 border-orange-500/30",
  },
  thumbs: {
    icon: ThumbsUp,
    label: "Thumbs Up",
    color: "text-blue-500",
    bg: "bg-blue-500/15 border-blue-500/30",
  },
  bulb: {
    icon: Lightbulb,
    label: "Idea",
    color: "text-yellow-500",
    bg: "bg-yellow-500/15 border-yellow-500/30",
  },
  rocket: {
    icon: Rocket,
    label: "Launch",
    color: "text-emerald-500",
    bg: "bg-emerald-500/15 border-emerald-500/30",
  },
};

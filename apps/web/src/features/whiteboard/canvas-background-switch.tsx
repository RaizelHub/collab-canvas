import { useState } from "react";
import { Grid, Grid2X2, LayoutGrid, Palette } from "lucide-react";
import type { Editor } from "tldraw";

export type GridMode = "dots" | "grid" | "blueprint" | "graph" | "blank";

interface CanvasBackgroundSwitchProps {
  editor?: Editor | null;
}

export function CanvasBackgroundSwitch({ editor }: CanvasBackgroundSwitchProps) {
  const [gridMode, setGridMode] = useState<GridMode>("dots");

  const setMode = (mode: GridMode) => {
    setGridMode(mode);
    if (!editor) return;

    // tldraw allows toggling gridMode via editor settings / instance state
    if (mode === "dots" || mode === "grid" || mode === "blueprint" || mode === "graph") {
      editor.updateInstanceState({ isGridMode: true });
    } else {
      editor.updateInstanceState({ isGridMode: false });
    }
  };

  return (
    <div className="relative">
      <details className="group relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded border border-line bg-panel px-2 text-xs font-medium text-muted hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent">
          <Grid2X2 className="size-3.5" />
          <span className="capitalize">{gridMode}</span>
        </summary>
        <div className="absolute left-0 top-10 z-30 w-36 rounded-lg border border-line bg-panel p-1.5 shadow-xl">
          <p className="mb-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
            Grid Style
          </p>
          {[
            { id: "dots", label: "Dots Grid" },
            { id: "grid", label: "Square Grid" },
            { id: "blueprint", label: "Blueprint" },
            { id: "blank", label: "Clean / Blank" },
          ].map((item) => (
            <button
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-xs font-medium transition-colors ${
                gridMode === item.id
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-hover hover:text-ink"
              }`}
              key={item.id}
              onClick={() => setMode(item.id as GridMode)}
              type="button"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Command, Keyboard, Search, X } from "lucide-react";

import { AccessibleDialog } from "./accessible-dialog";

interface ShortcutGroup {
  category: string;
  items: { key: string; description: string }[];
}

const SHORTCUTS: ShortcutGroup[] = [
  {
    category: "Tools & Drawing",
    items: [
      { key: "V / 1", description: "Select tool" },
      { key: "H / 2", description: "Hand / Pan tool" },
      { key: "D / 3", description: "Draw / Pen" },
      { key: "E / 4", description: "Eraser" },
      { key: "A / 5", description: "Arrow tool" },
      { key: "T / 6", description: "Text tool" },
      { key: "N / 7", description: "Sticky Note" },
      { key: "R / 8", description: "Rectangle" },
      { key: "O / 9", description: "Ellipse" },
      { key: "K", description: "Laser Pointer Mode" },
    ],
  },
  {
    category: "Navigation & View",
    items: [
      { key: "Space + Drag", description: "Pan canvas" },
      { key: "Ctrl / Cmd + Scroll", description: "Zoom in / out" },
      { key: "Shift + 1", description: "Zoom to fit all content" },
      { key: "Shift + 2", description: "Zoom to selection" },
      { key: "Shift + 0", description: "Reset zoom to 100%" },
      { key: "Ctrl / Cmd + '", description: "Toggle grid" },
    ],
  },
  {
    category: "Editing & Selection",
    items: [
      { key: "Ctrl / Cmd + C", description: "Copy selected shapes" },
      { key: "Ctrl / Cmd + V", description: "Paste shapes" },
      { key: "Ctrl / Cmd + D", description: "Duplicate selection" },
      { key: "Ctrl / Cmd + Z", description: "Undo" },
      { key: "Ctrl / Cmd + Shift + Z", description: "Redo" },
      { key: "Delete / Backspace", description: "Delete selected shapes" },
      { key: "Ctrl / Cmd + A", description: "Select all shapes" },
      { key: "Escape", description: "Deselect all / cancel tool" },
    ],
  },
  {
    category: "Facilitation & Help",
    items: [
      { key: "?", description: "Open Keyboard Shortcuts" },
      { key: "Alt + T", description: "Open Meeting Timer" },
    ],
  },
];

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({
  isOpen,
  onClose,
}: KeyboardShortcutsDialogProps) {
  const [search, setSearch] = useState("");

  const filtered = SHORTCUTS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) =>
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((group) => group.items.length > 0);

  if (!isOpen) return null;

  return (
    <AccessibleDialog
      description="Speed up your whiteboard workflows with quick key combinations."
      onClose={onClose}
      panelClassName="max-w-2xl"
      title="Keyboard Shortcuts"
    >
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
              <Keyboard className="size-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-muted">
                Speed up your whiteboard workflows with quick key combinations.
              </p>
            </div>
          </div>
          <button
            aria-label="Close shortcuts"
            className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            aria-label="Search shortcuts"
            className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-xs text-ink outline-none focus:border-accent"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shortcuts…"
            type="search"
            value={search}
          />
        </div>

        {/* Shortcut Groups Grid */}
        <div className="mt-4 grid max-h-96 grid-cols-1 gap-6 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((group) => (
            <div key={group.category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {group.category}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    className="flex items-center justify-between rounded border border-line/40 bg-canvas/60 px-2.5 py-1.5 text-xs"
                    key={item.key + item.description}
                  >
                    <span className="text-muted">{item.description}</span>
                    <kbd className="rounded border border-line bg-panel px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-2 py-8 text-center text-xs text-muted">
              No shortcuts found matching "{search}".
            </div>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}

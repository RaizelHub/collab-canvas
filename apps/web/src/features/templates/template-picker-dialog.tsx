import { useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import type { Editor } from "tldraw";

import { AccessibleDialog } from "../../components/accessible-dialog";
import { BOARD_TEMPLATES, type BoardTemplate } from "./templates";

interface TemplatePickerDialogProps {
  editor?: Editor | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: BoardTemplate) => void;
}

export function TemplatePickerDialog({
  editor,
  isOpen,
  onClose,
  onSelectTemplate,
}: TemplatePickerDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "agile", label: "Agile & Scrum" },
    { id: "planning", label: "Planning & Strategy" },
    { id: "engineering", label: "Engineering" },
    { id: "brainstorming", label: "Brainstorming" },
  ];

  const filteredTemplates = BOARD_TEMPLATES.filter((template) => {
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch =
      template.name.toLowerCase().includes(search.toLowerCase()) ||
      template.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleApply = (template: BoardTemplate) => {
    if (editor) {
      const pageBounds = editor.getViewportPageBounds();
      const originX = Math.round(pageBounds.minX + 80);
      const originY = Math.round(pageBounds.minY + 80);
      template.apply(editor, originX, originY);
      editor.zoomToFit({ animation: { duration: 300 } });
    }
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AccessibleDialog
      description="Kickstart your board with pre-built layouts and workflows."
      onClose={onClose}
      panelClassName="max-w-3xl"
      title="Template Library"
    >
      <div className="w-full">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink">
                Template Library
              </h2>
              <p className="text-xs text-muted">
                Kickstart your board with pre-built layouts and workflows.
              </p>
            </div>
          </div>
          <button
            aria-label="Close templates"
            className="grid size-8 place-items-center rounded-md border border-line text-muted hover:bg-hover hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              aria-label="Search templates"
              className="h-9 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-xs text-ink outline-none focus:border-accent"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              type="search"
              value={search}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? "bg-accent text-white"
                    : "border border-line bg-canvas text-muted hover:bg-hover hover:text-ink"
                }`}
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                type="button"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="mt-5 grid max-h-96 grid-cols-1 gap-3.5 overflow-y-auto pr-1 sm:grid-cols-2">
          {filteredTemplates.map((template) => (
            <div
              className="group relative flex flex-col justify-between rounded-lg border border-line bg-canvas p-4 transition-all hover:border-accent hover:shadow-md"
              key={template.id}
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="text-2xl" role="img" aria-label={template.name}>
                    {template.icon}
                  </span>
                  <span className="rounded-full bg-line/60 px-2 py-0.5 text-[10px] font-medium text-muted">
                    {template.badge}
                  </span>
                </div>
                <h3 className="mt-2.5 text-sm font-semibold text-ink group-hover:text-accent">
                  {template.name}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {template.description}
                </p>
              </div>
              <button
                className="mt-4 flex h-8 w-full items-center justify-center gap-1.5 rounded bg-accent px-3 text-xs font-medium text-white transition-opacity hover:opacity-90"
                onClick={() => handleApply(template)}
                type="button"
              >
                Use Template
              </button>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-2 py-12 text-center text-xs text-muted">
              No templates found matching your search.
            </div>
          )}
        </div>
      </div>
    </AccessibleDialog>
  );
}

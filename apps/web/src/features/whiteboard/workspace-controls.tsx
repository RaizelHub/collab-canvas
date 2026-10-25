import { SolidIcon } from "../../components/solid-icon";
import { useId } from "react";
import { DefaultToolbar, useEditor, useValue, type TLGridProps } from "tldraw";

export function WorkspaceGrid({ x, y, z }: TLGridProps) {
  const id = useId().replace(/:/g, "");
  // Coarsen at distant zoom levels while retaining world-space alignment.
  const step = 24 * z * Math.pow(2, Math.max(0, Math.ceil(Math.log2(0.5 / z))));
  return (
    <svg className="tl-grid" aria-hidden="true">
      <defs>
        <pattern
          id={id}
          width={step}
          height={step}
          patternUnits="userSpaceOnUse"
          x={x * z}
          y={y * z}
        >
          <circle cx={1} cy={1} r={1} fill="#d9dde3" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function WorkspaceToolbar() {
  return (
    <DefaultToolbar
      orientation="vertical"
      minItems={4}
      maxItems={9}
      minSizePx={200}
      maxSizePx={460}
    />
  );
}

export function WorkspaceNavigation() {
  const editor = useEditor();
  const zoom = useValue(
    "workspace zoom",
    () => Math.round(editor.getZoomLevel() * 100),
    [editor],
  );
  const isHand = useValue(
    "workspace hand",
    () => editor.getCurrentToolId() === "hand",
    [editor],
  );
  return (
    <div className="workspace-navigation" aria-label="Canvas navigation">
      <button
        aria-label="Pan canvas"
        title="Pan canvas (H)"
        aria-pressed={isHand}
        onClick={() => editor.setCurrentTool("hand")}
      >
        <SolidIcon name="hand" size={20} />
      </button>
      <button
        aria-label="Fit to content"
        title="Fit to content (Shift + 1)"
        onClick={() => editor.zoomToFit()}
      >
        <SolidIcon name="fit" size={18} />
      </button>
      <span className="workspace-control-divider" />
      <button
        aria-label="Zoom out"
        title="Zoom out"
        onClick={() => editor.zoomOut()}
      >
        <SolidIcon name="minus" size={18} />
      </button>
      <button
        className="workspace-zoom-value"
        aria-label="Reset zoom to 100%"
        title="Reset zoom to 100%"
        onClick={() => editor.resetZoom()}
      >
        {zoom}%
      </button>
      <button
        aria-label="Zoom in"
        title="Zoom in"
        onClick={() => editor.zoomIn()}
      >
        <SolidIcon name="plus" size={18} />
      </button>
    </div>
  );
}

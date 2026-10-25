import { useCallback, useState } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/csr/ArrowUUpRight";
import {
  Tldraw,
  DefaultFontStyle,
  DefaultColorStyle,
  DefaultStylePanel,
  useEditor,
  useValue,
  type Editor,
  type TLComponents,
} from "tldraw";
import { SolidIcon } from "../../components/solid-icon";
import {
  WorkspaceGrid,
  WorkspaceNavigation,
} from "../whiteboard/workspace-controls";
import { workspaceShapeUtils } from "../whiteboard/shape-styles";
import { seedLandingPreview } from "./preview-seed";
import "tldraw/tldraw.css";
import "../whiteboard/workspace.css";

const tools = [
  { id: "select", icon: "pointer", label: "Select", key: "V" },
  { id: "hand", icon: "hand", label: "Pan", key: "H" },
  { id: "note", icon: "note", label: "Sticky note", key: "N" },
  { id: "draw", icon: "pencil", label: "Draw", key: "D" },
  { id: "text", icon: "text", label: "Text", key: "T" },
  { id: "eraser", icon: "eraser", label: "Eraser", key: "E" },
] as const;

function PreviewTools() {
  const editor = useEditor();
  const selected = useValue("preview tool", () => editor.getCurrentToolId(), [
    editor,
  ]);
  return (
    <div
      className="landing-tool-palette"
      role="toolbar"
      aria-label="Preview drawing tools"
    >
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          aria-label={tool.label}
          title={`${tool.label} (${tool.key})`}
          aria-pressed={selected === tool.id}
          onClick={() => {
            if (tool.id === "note")
              editor.setStyleForNextShapes(DefaultColorStyle, "yellow");
            if (tool.id === "draw" || tool.id === "text")
              editor.setStyleForNextShapes(DefaultColorStyle, "black");
            editor.setCurrentTool(tool.id);
            editor.focus();
          }}
        >
          <SolidIcon name={tool.icon} size={22} />
        </button>
      ))}
    </div>
  );
}

function PreviewHistory() {
  const editor = useEditor();
  const canUndo = useValue("preview undo", () => editor.getCanUndo(), [editor]);
  const canRedo = useValue("preview redo", () => editor.getCanRedo(), [editor]);
  return (
    <div className="landing-preview-history">
      <button
        type="button"
        aria-label="Undo"
        title="Undo (Ctrl / Cmd + Z)"
        disabled={!canUndo}
        onClick={() => editor.undo()}
      >
        <ArrowUUpLeftIcon size={18} weight="bold" />
      </button>
      <button
        type="button"
        aria-label="Redo"
        title="Redo (Ctrl / Cmd + Shift + Z)"
        disabled={!canRedo}
        onClick={() => editor.redo()}
      >
        <ArrowUUpRightIcon size={18} weight="bold" />
      </button>
    </div>
  );
}

function PreviewStylePanel() {
  const editor = useEditor();
  const visible = useValue(
    "preview styling",
    () =>
      editor.getSelectedShapeIds().length > 0 ||
      ["note", "draw", "text"].includes(editor.getCurrentToolId()),
    [editor],
  );
  return visible ? <DefaultStylePanel /> : null;
}

const components: TLComponents = {
  Grid: WorkspaceGrid,
  Toolbar: PreviewTools,
  NavigationPanel: WorkspaceNavigation,
  MenuPanel: PreviewHistory,
  StylePanel: PreviewStylePanel,
  PageMenu: null,
  SharePanel: null,
  QuickActions: null,
  ActionsMenu: null,
  HelpMenu: null,
  DebugMenu: null,
};

export default function LandingPreview() {
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const onMount = useCallback((editor: Editor) => {
    editor.updateInstanceState({ isGridMode: true });
    editor.setStyleForNextShapes(DefaultFontStyle, "sans");
    editor.setStyleForNextShapes(DefaultColorStyle, "yellow");
    seedLandingPreview(editor);
    editor.clearHistory();
    setReady(true);
  }, []);

  return (
    <>
      <div className="landing-preview-topline">
        <span className="landing-demo-label">
          <span />
          Your idea playground <small>Temporary demo</small>
        </span>
        <button
          className="landing-reset"
          type="button"
          disabled={!ready}
          onClick={() => {
            setReady(false);
            setGeneration((value) => value + 1);
            setAnnouncement("Demo reset. The original sample notes are ready.");
          }}
        >
          <ArrowCounterClockwiseIcon size={16} weight="bold" />
          Reset demo
        </button>
      </div>
      <div className="landing-live-canvas" data-testid="landing-live-canvas">
        {/* No persistenceKey, sync hook, account, or remote store: fresh on every mount. */}
        <Tldraw
          key={generation}
          autoFocus={false}
          colorScheme="light"
          components={components}
          shapeUtils={workspaceShapeUtils}
          onMount={onMount}
        />
      </div>
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}

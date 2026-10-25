import type { ComponentProps } from "react";
import type { TLUiOverrides } from "tldraw";
import { SolidIcon } from "../../components/solid-icon";

const toolsToIcons: Record<string, ComponentProps<typeof SolidIcon>["name"]> = {
  select: "pointer",
  hand: "hand",
  note: "note",
  text: "text",
  draw: "pencil",
  asset: "image",
  arrow: "arrow",
  rectangle: "rectangle",
  ellipse: "ellipse",
  diamond: "diamond",
  eraser: "eraser",
  highlight: "highlighter",
  frame: "frame",
  line: "line",
};

export const phosphorOverrides: TLUiOverrides = {
  tools: (_editor, tools) =>
    Object.fromEntries(
      Object.entries(tools).map(([id, tool]) => {
        const icon = toolsToIcons[id];
        return [
          id,
          icon
            ? {
                ...tool,
                icon: (
                  <div className="workspace-tool-icon">
                    <SolidIcon name={icon} size={22} />
                  </div>
                ),
              }
            : tool,
        ];
      }),
    ),
};

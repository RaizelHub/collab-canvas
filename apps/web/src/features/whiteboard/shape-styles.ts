import { NoteShapeUtil } from "tldraw";

export const workspaceShapeUtils = [
  NoteShapeUtil.configure({
    resizeMode: "scale",
    getCustomDisplayValues: (_editor, shape) => {
      const palette: Record<string, string> = {
        yellow: "#FFF176",
        "light-green": "#80E5D8",
        "light-violet": "#D7C2FF",
        "light-red": "#FFBCD1",
        "light-blue": "#B7DBFF",
      };
      const color = palette[shape.props.color];
      return color
        ? { noteBackgroundColor: color, labelColor: "#202631", borderWidth: 0 }
        : {};
    },
  }),
];

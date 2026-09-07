import { createShapeId, type Editor } from "tldraw";
import { toRichText, type TLDefaultColorStyle } from "@tldraw/tlschema";

export interface BoardTemplate {
  id: string;
  name: string;
  category: "agile" | "planning" | "engineering" | "brainstorming";
  description: string;
  icon: string;
  badge: string;
  apply: (editor: Editor, originX?: number, originY?: number) => void;
}

export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "sprint-retro",
    name: "Sprint Retrospective",
    category: "agile",
    description:
      "3-column retro board with What Went Well, What Could Improve, and Action Items.",
    icon: "rotate-ccw",
    badge: "Agile / Scrum",
    apply: (editor: Editor, originX = 100, originY = 100) => {
      const colWidth = 320;
      const colHeight = 540;
      const gap = 30;

      const columns: {
        title: string;
        color: TLDefaultColorStyle;
        noteColor: TLDefaultColorStyle;
        notes: string[];
      }[] = [
        {
          title: "What Went Well",
          color: "green",
          noteColor: "light-green",
          notes: [
            "Team velocity improved",
            "Great code reviews",
            "Shipped on schedule",
          ],
        },
        {
          title: "What Could Be Better",
          color: "red",
          noteColor: "light-red",
          notes: ["Flaky CI integration test", "Spec changed mid-sprint"],
        },
        {
          title: "Action Items",
          color: "blue",
          noteColor: "light-blue",
          notes: [
            "Automate release checks",
            "Schedule API sync before kickoff",
          ],
        },
      ];

      const shapes: Parameters<Editor["createShapes"]>[0] = [];

      columns.forEach((col, i) => {
        const x = originX + i * (colWidth + gap);
        const y = originY;

        // Background Column Box
        shapes.push({
          id: createShapeId(),
          type: "geo",
          x,
          y,
          props: {
            geo: "rectangle",
            w: colWidth,
            h: colHeight,
            fill: "semi",
            color: col.color,
            dash: "draw",
            size: "m",
          },
        });

        // Column Header Text
        shapes.push({
          id: createShapeId(),
          type: "text",
          x: x + 16,
          y: y + 16,
          props: {
            richText: toRichText(col.title),
            size: "m",
            color: col.color,
            font: "sans",
          },
        });

        // Sticky notes inside column
        col.notes.forEach((noteText, noteIndex) => {
          shapes.push({
            id: createShapeId(),
            type: "note",
            x: x + 20,
            y: y + 70 + noteIndex * 150,
            props: {
              richText: toRichText(noteText),
              color: col.noteColor,
              size: "s",
              font: "sans",
            },
          });
        });
      });

      editor.createShapes(shapes);
    },
  },
  {
    id: "kanban-workflow",
    name: "Kanban Workflow",
    category: "planning",
    description:
      "4-stage workflow board with Backlog, In Progress, In Review, and Done columns.",
    icon: "kanban",
    badge: "Productivity",
    apply: (editor: Editor, originX = 100, originY = 100) => {
      const colWidth = 280;
      const colHeight = 560;
      const gap = 24;

      const stages: {
        title: string;
        color: TLDefaultColorStyle;
        notes: string[];
      }[] = [
        {
          title: "Backlog",
          color: "grey",
          notes: ["Audit WCAG compliance", "Design mobile navigation"],
        },
        {
          title: "In Progress",
          color: "yellow",
          notes: ["Implement real-time timer", "Follow-me presenter mode"],
        },
        {
          title: "In Review",
          color: "orange",
          notes: ["CORS worker configuration", "Mini-map navigator"],
        },
        {
          title: "Done",
          color: "green",
          notes: ["tldraw sync engine", "Supabase authentication"],
        },
      ];

      const shapes: Parameters<Editor["createShapes"]>[0] = [];

      stages.forEach((stage, i) => {
        const x = originX + i * (colWidth + gap);
        const y = originY;

        shapes.push({
          id: createShapeId(),
          type: "geo",
          x,
          y,
          props: {
            geo: "rectangle",
            w: colWidth,
            h: colHeight,
            fill: "semi",
            color: stage.color,
            dash: "draw",
            size: "s",
          },
        });

        shapes.push({
          id: createShapeId(),
          type: "text",
          x: x + 16,
          y: y + 16,
          props: {
            richText: toRichText(stage.title),
            size: "m",
            color: stage.color,
            font: "sans",
          },
        });

        stage.notes.forEach((text, noteIdx) => {
          shapes.push({
            id: createShapeId(),
            type: "note",
            x: x + 20,
            y: y + 65 + noteIdx * 145,
            props: {
              richText: toRichText(text),
              color: stage.color,
              size: "s",
              font: "sans",
            },
          });
        });
      });

      editor.createShapes(shapes);
    },
  },
  {
    id: "impact-effort-matrix",
    name: "Impact vs Effort Matrix",
    category: "planning",
    description:
      "2x2 prioritization grid (Quick Wins, Major Projects, Fill-ins, Thankless Tasks).",
    icon: "target",
    badge: "Prioritization",
    apply: (editor: Editor, originX = 100, originY = 100) => {
      const size = 560;
      const half = size / 2;

      const quadrants: {
        label: string;
        x: number;
        y: number;
        color: TLDefaultColorStyle;
        sample: string;
      }[] = [
        {
          label: "Quick Wins (High Impact / Low Effort)",
          x: originX,
          y: originY,
          color: "green",
          sample: "Add copy link button",
        },
        {
          label: "Major Projects (High Impact / High Effort)",
          x: originX + half,
          y: originY,
          color: "blue",
          sample: "Realtime audio mesh",
        },
        {
          label: "Fill-ins (Low Impact / Low Effort)",
          x: originX,
          y: originY + half,
          color: "yellow",
          sample: "Update brand favicon",
        },
        {
          label: "Reconsider (Low Impact / High Effort)",
          x: originX + half,
          y: originY + half,
          color: "red",
          sample: "Custom canvas engine",
        },
      ];

      const shapes: Parameters<Editor["createShapes"]>[0] = [];

      quadrants.forEach((q) => {
        shapes.push({
          id: createShapeId(),
          type: "geo",
          x: q.x,
          y: q.y,
          props: {
            geo: "rectangle",
            w: half - 8,
            h: half - 8,
            fill: "semi",
            color: q.color,
            dash: "draw",
            size: "s",
          },
        });

        shapes.push({
          id: createShapeId(),
          type: "text",
          x: q.x + 12,
          y: q.y + 12,
          props: {
            richText: toRichText(q.label),
            size: "s",
            color: q.color,
            font: "sans",
          },
        });

        shapes.push({
          id: createShapeId(),
          type: "note",
          x: q.x + 40,
          y: q.y + 60,
          props: {
            richText: toRichText(q.sample),
            color: q.color,
            size: "s",
            font: "sans",
          },
        });
      });

      editor.createShapes(shapes);
    },
  },
  {
    id: "architecture-starter",
    name: "System Architecture",
    category: "engineering",
    description:
      "Cloud system blueprint with Client, API Gateway, Worker/Services, and Database.",
    icon: "cpu",
    badge: "Architecture",
    apply: (editor: Editor, originX = 100, originY = 100) => {
      const shapes: Parameters<Editor["createShapes"]>[0] = [];

      const blocks: {
        title: string;
        x: number;
        y: number;
        color: TLDefaultColorStyle;
      }[] = [
        {
          title: "Browser Client\n(React 19 + tldraw)",
          x: originX,
          y: originY + 120,
          color: "blue",
        },
        {
          title: "Cloudflare Edge\n(Worker + DO)",
          x: originX + 280,
          y: originY + 120,
          color: "orange",
        },
        {
          title: "Supabase DB\n(PostgreSQL + Auth)",
          x: originX + 560,
          y: originY + 40,
          color: "green",
        },
        {
          title: "R2 Bucket\n(Media & Assets)",
          x: originX + 560,
          y: originY + 200,
          color: "violet",
        },
      ];

      blocks.forEach((b) => {
        shapes.push({
          id: createShapeId(),
          type: "geo",
          x: b.x,
          y: b.y,
          props: {
            geo: "rectangle",
            w: 190,
            h: 90,
            fill: "semi",
            color: b.color,
            dash: "draw",
            size: "s",
          },
        });

        shapes.push({
          id: createShapeId(),
          type: "text",
          x: b.x + 12,
          y: b.y + 16,
          props: {
            richText: toRichText(b.title),
            size: "s",
            color: b.color,
            font: "sans",
          },
        });
      });

      editor.createShapes(shapes);
    },
  },
  {
    id: "mind-map",
    name: "Mind Map & Brainstorming",
    category: "brainstorming",
    description:
      "Central topic hub branching into sub-topics with color-coded idea nodes.",
    icon: "lightbulb",
    badge: "Ideation",
    apply: (editor: Editor, originX = 200, originY = 150) => {
      const shapes: Parameters<Editor["createShapes"]>[0] = [];

      // Center Hub
      shapes.push({
        id: createShapeId(),
        type: "geo",
        x: originX + 200,
        y: originY + 120,
        props: {
          geo: "ellipse",
          w: 200,
          h: 100,
          fill: "solid",
          color: "violet",
          size: "m",
        },
      });

      shapes.push({
        id: createShapeId(),
        type: "text",
        x: originX + 225,
        y: originY + 155,
        props: {
          richText: toRichText("Core Concept"),
          size: "m",
          color: "grey",
          font: "sans",
        },
      });

      // Branch ideas
      const branches: {
        text: string;
        x: number;
        y: number;
        color: TLDefaultColorStyle;
      }[] = [
        { text: "Feature Discovery", x: originX, y: originY, color: "blue" },
        {
          text: "User Experience",
          x: originX + 440,
          y: originY,
          color: "green",
        },
        {
          text: "Realtime Scalability",
          x: originX,
          y: originY + 260,
          color: "yellow",
        },
        {
          text: "Integration & APIs",
          x: originX + 440,
          y: originY + 260,
          color: "orange",
        },
      ];

      branches.forEach((branch) => {
        shapes.push({
          id: createShapeId(),
          type: "note",
          x: branch.x,
          y: branch.y,
          props: {
            richText: toRichText(branch.text),
            color: branch.color,
            size: "s",
            font: "sans",
          },
        });
      });

      editor.createShapes(shapes);
    },
  },
];

import { createShapeId, type Editor } from "tldraw";
import { toRichText } from "@tldraw/tlschema";
import { localBoardRepository } from "./local-board-repository";

export const DEMO_BOARD_ID = "demo-sandbox-showcase";

export function getOrCreateDemoBoard() {
  const existing = localBoardRepository.getBoardById(DEMO_BOARD_ID);
  if (existing.ok && existing.value) {
    return existing.value;
  }

  // Create or register the demo board with predictable DEMO_BOARD_ID
  const result = localBoardRepository.createBoard("Interactive Showcase Sandbox", DEMO_BOARD_ID);
  if (result.ok) {
    return result.value;
  }
  return {
    id: DEMO_BOARD_ID,
    title: "Interactive Showcase Sandbox",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastOpenedAt: new Date().toISOString(),
  };
}

export function populateDemoBoard(editor: Editor) {
  // Only populate if empty
  if (editor.getCurrentPageShapes().length > 0) {
    return;
  }

  const shapes: Parameters<Editor["createShapes"]>[0] = [];

  // --- 1. WELCOME BANNER ---
  shapes.push({
    id: createShapeId("demo-welcome-card"),
    type: "geo",
    x: 60,
    y: 60,
    props: {
      geo: "rectangle",
      w: 880,
      h: 170,
      fill: "semi",
      color: "blue",
      dash: "solid",
      size: "m",
    },
  });

  shapes.push({
    id: createShapeId("demo-welcome-title"),
    type: "text",
    x: 90,
    y: 80,
    props: {
      richText: toRichText("CollabCanvas — Live Distributed Whiteboard"),
      size: "l",
      color: "blue",
      font: "sans",
    },
  });

  shapes.push({
    id: createShapeId("demo-welcome-desc"),
    type: "text",
    x: 90,
    y: 130,
    props: {
      richText: toRichText(
        "Welcome! This sandbox showcases real-time collaboration with Cloudflare Durable Objects, SQLite, Supabase RLS, and tldraw.\nTry: 1) Click 'System Architecture' in header  2) Try 'Dot Voting' or 'Templates'  3) Open in 2 windows to test live sync!"
      ),
      size: "s",
      color: "grey",
      font: "sans",
    },
  });

  // --- 2. ARCHITECTURE DIAGRAM SECTION ---
  const archX = 60;
  const archY = 280;

  // React Client Box
  shapes.push({
    id: createShapeId("arch-client"),
    type: "geo",
    x: archX,
    y: archY,
    props: {
      geo: "rectangle",
      w: 240,
      h: 110,
      fill: "pattern",
      color: "light-blue",
      dash: "solid",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("arch-client-text"),
    type: "text",
    x: archX + 20,
    y: archY + 25,
    props: {
      richText: toRichText("React 19 + tldraw\n(Client State / TLShape)"),
      size: "s",
      color: "blue",
      font: "mono",
    },
  });

  // Worker Edge Box
  shapes.push({
    id: createShapeId("arch-worker"),
    type: "geo",
    x: archX + 340,
    y: archY,
    props: {
      geo: "rectangle",
      w: 260,
      h: 110,
      fill: "pattern",
      color: "orange",
      dash: "solid",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("arch-worker-text"),
    type: "text",
    x: archX + 355,
    y: archY + 25,
    props: {
      richText: toRichText("Cloudflare Worker\n(Hibernating WebSockets)"),
      size: "s",
      color: "orange",
      font: "mono",
    },
  });

  // Durable Object + SQLite Box
  shapes.push({
    id: createShapeId("arch-do"),
    type: "geo",
    x: archX + 700,
    y: archY,
    props: {
      geo: "rectangle",
      w: 240,
      h: 110,
      fill: "pattern",
      color: "green",
      dash: "solid",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("arch-do-text"),
    type: "text",
    x: archX + 715,
    y: archY + 25,
    props: {
      richText: toRichText("Durable Object\n(Embedded SQLite Storage)"),
      size: "s",
      color: "green",
      font: "mono",
    },
  });

  // Connecting arrows
  shapes.push({
    id: createShapeId("arrow-1"),
    type: "arrow",
    x: archX + 245,
    y: archY + 55,
    props: {
      start: { x: 0, y: 0 },
      end: { x: 90, y: 0 },
      color: "black",
      size: "m",
      dash: "draw",
    },
  });

  shapes.push({
    id: createShapeId("arrow-2"),
    type: "arrow",
    x: archX + 605,
    y: archY + 55,
    props: {
      start: { x: 0, y: 0 },
      end: { x: 90, y: 0 },
      color: "black",
      size: "m",
      dash: "draw",
    },
  });

  // --- 3. AGILE RETROSPECTIVE SECTION ---
  const retroX = 60;
  const retroY = 460;
  const colW = 280;
  const gap = 20;

  // Column 1: Went Well
  shapes.push({
    id: createShapeId("retro-col-1"),
    type: "geo",
    x: retroX,
    y: retroY,
    props: {
      geo: "rectangle",
      w: colW,
      h: 380,
      fill: "semi",
      color: "green",
      dash: "draw",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("retro-head-1"),
    type: "text",
    x: retroX + 15,
    y: retroY + 15,
    props: {
      richText: toRichText("What Went Well"),
      size: "m",
      color: "green",
      font: "sans",
    },
  });
  shapes.push({
    id: createShapeId("retro-note-1a"),
    type: "note",
    x: retroX + 20,
    y: retroY + 65,
    props: {
      richText: toRichText("Zero-latency local optimistic rendering with instant UI feedback."),
      color: "light-green",
      size: "s",
    },
  });
  shapes.push({
    id: createShapeId("retro-note-1b"),
    type: "note",
    x: retroX + 20,
    y: retroY + 210,
    props: {
      richText: toRichText("Durable Object Hibernation reduces cost to near zero when idle."),
      color: "light-green",
      size: "s",
    },
  });

  // Column 2: What to Improve
  shapes.push({
    id: createShapeId("retro-col-2"),
    type: "geo",
    x: retroX + colW + gap,
    y: retroY,
    props: {
      geo: "rectangle",
      w: colW,
      h: 380,
      fill: "semi",
      color: "red",
      dash: "draw",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("retro-head-2"),
    type: "text",
    x: retroX + colW + gap + 15,
    y: retroY + 15,
    props: {
      richText: toRichText("Needs Improvement"),
      size: "m",
      color: "red",
      font: "sans",
    },
  });
  shapes.push({
    id: createShapeId("retro-note-2a"),
    type: "note",
    x: retroX + colW + gap + 20,
    y: retroY + 65,
    props: {
      richText: toRichText("Flaky network simulation testing on high-packet-loss 3G."),
      color: "light-red",
      size: "s",
    },
  });

  // Column 3: Action Items
  shapes.push({
    id: createShapeId("retro-col-3"),
    type: "geo",
    x: retroX + (colW + gap) * 2,
    y: retroY,
    props: {
      geo: "rectangle",
      w: colW,
      h: 380,
      fill: "semi",
      color: "blue",
      dash: "draw",
      size: "m",
    },
  });
  shapes.push({
    id: createShapeId("retro-head-3"),
    type: "text",
    x: retroX + (colW + gap) * 2 + 15,
    y: retroY + 15,
    props: {
      richText: toRichText("Action Items"),
      size: "m",
      color: "blue",
      font: "sans",
    },
  });
  shapes.push({
    id: createShapeId("retro-note-3a"),
    type: "note",
    x: retroX + (colW + gap) * 2 + 20,
    y: retroY + 65,
    props: {
      richText: toRichText("Deploy automated k6 WebSocket stress benchmark in CI."),
      color: "light-blue",
      size: "s",
    },
  });

  // Create all shapes and zoom to fit
  editor.createShapes(shapes);
  editor.zoomToFit({ animation: { duration: 350 } });
}

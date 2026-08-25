import type { CollabObject, PresencePlayer } from "@collab-canvas/shared";
import {
  Accessibility,
  ArrowLeft,
  List,
  MousePointer2,
  Pencil,
  StickyNote,
  Trash2,
  Type,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Link } from "react-router";

import { useCollabSpace } from "../features/portfolio/use-collab-space";
import "./portfolio.css";

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 1200;
const SPEED = 245;

const obstacles = [
  { x: 100, y: 90, width: 600, height: 250 },
  { x: 1290, y: 90, width: 610, height: 280 },
  { x: 785, y: 420, width: 430, height: 250 },
  { x: 90, y: 760, width: 470, height: 300 },
  { x: 1450, y: 720, width: 450, height: 330 },
];

const interactables = [
  { id: "work", x: 400, y: 380, radius: 210, label: "Explore selected work" },
  { id: "collab", x: 1590, y: 420, radius: 220, label: "Leave your mark" },
  { id: "table", x: 1000, y: 730, radius: 190, label: "Open canvas" },
  { id: "about", x: 360, y: 700, radius: 180, label: "Read about the build" },
  { id: "notes", x: 1630, y: 680, radius: 190, label: "Visit the guest wall" },
];

function pointIsOpen(x: number, y: number): boolean {
  if (x < 42 || x > WORLD_WIDTH - 42 || y < 42 || y > WORLD_HEIGHT - 42)
    return false;
  return !obstacles.some(
    (rect) =>
      x > rect.x - 27 &&
      x < rect.x + rect.width + 27 &&
      y > rect.y - 27 &&
      y < rect.y + rect.height + 27,
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function CollabSpacePage() {
  const collab = useCollabSpace();
  const sendMove = collab.sendMove;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef(new Set<string>());
  const targetRef = useRef<{ x: number; y: number } | null>(null);
  const positionRef = useRef<PresencePlayer | null>(null);
  const lastSentRef = useRef(0);
  const [localPlayer, setLocalPlayer] = useState<PresencePlayer | null>(null);
  const [camera, setCamera] = useState({ x: 680, y: 560, scale: 0.72 });
  const [hasMoved, setHasMoved] = useState(false);
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    if (!collab.session || positionRef.current) return;
    const fromServer = collab.players.find(
      (player) => player.visitorId === collab.session?.visitor.id,
    );
    const player = fromServer ?? {
      visitorId: collab.session.visitor.id,
      name: collab.session.visitor.name,
      avatarUrl: collab.session.visitor.avatarUrl,
      color: collab.session.visitor.color,
      x: 1000,
      y: 1080,
      direction: "up" as const,
      moving: false,
      sequence: 0,
    };
    positionRef.current = player;
    setLocalPlayer(player);
  }, [collab.players, collab.session]);

  const nearest = useMemo(() => {
    if (!localPlayer) return null;
    return (
      interactables
        .map((item) => ({
          ...item,
          distance: Math.hypot(localPlayer.x - item.x, localPlayer.y - item.y),
        }))
        .filter((item) => item.distance < item.radius)
        .sort((a, b) => a.distance - b.distance)[0] ?? null
    );
  }, [localPlayer]);

  const interact = (id: string) => {
    if (id === "collab" || id === "table" || id === "notes") {
      setCanvasOpen(true);
      setDetail(null);
    } else {
      setDetail(id);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement | null;
      if (element?.matches("input, textarea, select, [contenteditable='true']"))
        return;
      const key = event.key.toLowerCase();
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowleft",
          "arrowdown",
          "arrowright",
        ].includes(key)
      ) {
        event.preventDefault();
        keysRef.current.add(key);
        targetRef.current = null;
      }
      if (key === "e" && nearest && !canvasOpen) {
        event.preventDefault();
        interact(nearest.id);
      }
      if (key === "escape") {
        setCanvasOpen(false);
        setDirectoryOpen(false);
        setDetail(null);
      }
    };
    const onKeyUp = (event: KeyboardEvent) =>
      keysRef.current.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [canvasOpen, nearest]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const current = positionRef.current;
      const viewport = viewportRef.current;
      if (current && viewport && !canvasOpen) {
        const delta = Math.min((now - previous) / 1000, 0.04);
        let vx = 0;
        let vy = 0;
        if (keysRef.current.has("a") || keysRef.current.has("arrowleft"))
          vx -= 1;
        if (keysRef.current.has("d") || keysRef.current.has("arrowright"))
          vx += 1;
        if (keysRef.current.has("w") || keysRef.current.has("arrowup")) vy -= 1;
        if (keysRef.current.has("s") || keysRef.current.has("arrowdown"))
          vy += 1;
        if (!vx && !vy && targetRef.current) {
          const dx = targetRef.current.x - current.x;
          const dy = targetRef.current.y - current.y;
          const distance = Math.hypot(dx, dy);
          if (distance > 8) {
            vx = dx / distance;
            vy = dy / distance;
          } else targetRef.current = null;
        }
        const moving = Boolean(vx || vy);
        if (moving) {
          const length = Math.hypot(vx, vy) || 1;
          vx /= length;
          vy /= length;
          const nextX = current.x + vx * SPEED * delta;
          const nextY = current.y + vy * SPEED * delta;
          const resolvedX = pointIsOpen(nextX, current.y) ? nextX : current.x;
          const resolvedY = pointIsOpen(resolvedX, nextY) ? nextY : current.y;
          const direction =
            Math.abs(vx) > Math.abs(vy)
              ? vx > 0
                ? "right"
                : "left"
              : vy > 0
                ? "down"
                : "up";
          const next = {
            ...current,
            x: resolvedX,
            y: resolvedY,
            direction,
            moving: true,
            sequence: current.sequence + 1,
          } as PresencePlayer;
          positionRef.current = next;
          setLocalPlayer(next);
          setHasMoved(true);
          if (now - lastSentRef.current > 80) {
            sendMove(next);
            lastSentRef.current = now;
          }
        } else if (current.moving) {
          const next = {
            ...current,
            moving: false,
            sequence: current.sequence + 1,
          };
          positionRef.current = next;
          setLocalPlayer(next);
          sendMove(next);
        }
        const scale =
          viewport.clientWidth < 700
            ? 0.8
            : Math.min(1, Math.max(0.76, viewport.clientWidth / 1500));
        const visibleWidth = viewport.clientWidth / scale;
        const visibleHeight = viewport.clientHeight / scale;
        const desiredX = Math.max(
          0,
          Math.min(WORLD_WIDTH - visibleWidth, current.x - visibleWidth / 2),
        );
        const desiredY = Math.max(
          0,
          Math.min(WORLD_HEIGHT - visibleHeight, current.y - visibleHeight / 2),
        );
        setCamera((value) => ({
          x: value.x + (desiredX - value.x) * 0.09,
          y: value.y + (desiredY - value.y) * 0.09,
          scale,
        }));
      }
      previous = now;
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [canvasOpen, sendMove]);

  const walkTo = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    targetRef.current = {
      x: (event.clientX - rect.left) / camera.scale + camera.x,
      y: (event.clientY - rect.top) / camera.scale + camera.y,
    };
    setHasMoved(true);
  };

  const otherPlayers = collab.players.filter(
    (player) => player.visitorId !== collab.session?.visitor.id,
  );

  return (
    <main className="collab-space-page">
      <header className="space-header">
        <Link to="/" className="space-back">
          <ArrowLeft aria-hidden="true" /> Portfolio
        </Link>
        <div className="space-title">
          <span>Collab space</span>
          <small>A shared space shaped by everyone who visits.</small>
        </div>
        <div className="space-presence">
          <span>{otherPlayers.length + (localPlayer ? 1 : 0)} here now</span>
          <span className={`connection-copy connection-${collab.status}`}>
            {collab.status === "local" ? "saved on this device" : collab.status}
          </span>
        </div>
      </header>

      <div className="space-viewport" ref={viewportRef} onPointerDown={walkTo}>
        <div
          className="space-world"
          style={{
            transform: `translate(${-camera.x * camera.scale}px, ${-camera.y * camera.scale}px) scale(${camera.scale})`,
          }}
        >
          <div className="world-label world-label-top">
            SHARED PORTFOLIO ROOM / 01
          </div>
          <button
            className="room-zone project-wall"
            onClick={() => interact("work")}
            type="button"
          >
            <span className="zone-label">WORK</span>
            <span className="project-panel">
              <b>COLLAB CANVAS</b>
              <small>Realtime product</small>
            </span>
            <span className="project-panel">
              <b>SYNC LAYER</b>
              <small>Infrastructure</small>
            </span>
            <span className="project-panel">
              <b>ACCESSIBILITY</b>
              <small>Inclusive systems</small>
            </span>
          </button>
          <button
            className="room-zone collab-wall"
            onClick={() => interact("collab")}
            type="button"
          >
            <span className="zone-label">COLLAB</span>
            <strong>
              LEAVE
              <br />
              YOUR MARK
            </strong>
            <small>Text · note · drawing</small>
          </button>
          <button
            className="room-zone collab-table"
            onClick={() => interact("table")}
            type="button"
          >
            <span>OPEN CANVAS</span>
            <small>Shared surface</small>
          </button>
          <button
            className="room-zone about-corner"
            onClick={() => interact("about")}
            type="button"
          >
            <span className="zone-label">ABOUT</span>
            <strong>
              REALTIME,
              <br />
              WITH RESTRAINT.
            </strong>
            <small>Identity · presence · persistence</small>
          </button>
          <button
            className="room-zone guest-wall"
            onClick={() => interact("notes")}
            type="button"
          >
            <span className="zone-label">VISITORS</span>
            {collab.objects
              .filter((object) => object.type === "note")
              .slice(-3)
              .map((object) => (
                <span
                  className={`guest-note color-${object.color}`}
                  key={object.id}
                >
                  <b>{object.content}</b>
                  <small>{object.visitorName}</small>
                </span>
              ))}
            {!collab.objects.some((object) => object.type === "note") && (
              <span className="guest-empty">No notes yet.</span>
            )}
          </button>
          <div className="entrance-line">
            <span>ENTRANCE</span>
          </div>

          {otherPlayers.map((player) => (
            <SpacePlayer key={player.visitorId} player={player} />
          ))}
          {localPlayer && <SpacePlayer player={localPlayer} local />}
        </div>

        {!hasMoved && (
          <div className="movement-hint">
            <span>WASD / Arrows</span> move <span>or click</span> a destination
          </div>
        )}
        {nearest && !canvasOpen && (
          <button
            className="nearest-prompt"
            onClick={() => interact(nearest.id)}
            type="button"
          >
            <kbd>E</kbd> {nearest.label}
          </button>
        )}
        <button
          className="space-directory-button"
          onClick={() => setDirectoryOpen(true)}
          type="button"
        >
          <List aria-hidden="true" /> Explore without walking
        </button>
      </div>

      {detail && (
        <aside className="space-detail" aria-live="polite">
          <button
            aria-label="Close information"
            onClick={() => setDetail(null)}
            type="button"
          >
            <X />
          </button>
          {detail === "work" ? (
            <>
              <p>SELECTED WORK</p>
              <h2>Engineering from interaction to infrastructure.</h2>
              <p>Review the same projects without navigating the room.</p>
              <Link to="/#work">
                View selected work <ArrowLeft className="detail-arrow" />
              </Link>
            </>
          ) : (
            <>
              <p>ABOUT THIS SPACE</p>
              <h2>Presence is the interface.</h2>
              <p>
                Movement is ephemeral. Contributions persist. Identity is signed
                and privacy-safe.
              </p>
              <Link to="/#case-study">Read the case study</Link>
            </>
          )}
        </aside>
      )}

      {directoryOpen && (
        <div
          className="space-drawer-backdrop"
          onPointerDown={() => setDirectoryOpen(false)}
        >
          <aside
            className="space-directory"
            aria-label="Explore space without walking"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="directory-close"
              aria-label="Close directory"
              onClick={() => setDirectoryOpen(false)}
              type="button"
            >
              <X />
            </button>
            <Accessibility aria-hidden="true" />
            <p>DIRECT ACCESS</p>
            <h2>
              Everything in the room,
              <br />
              without the walk.
            </h2>
            <button
              onClick={() => {
                setDirectoryOpen(false);
                setDetail("work");
              }}
              type="button"
            >
              <span>01</span> Selected work
            </button>
            <button
              onClick={() => {
                setDirectoryOpen(false);
                setCanvasOpen(true);
              }}
              type="button"
            >
              <span>02</span> Collaborative canvas
            </button>
            <button
              onClick={() => {
                setDirectoryOpen(false);
                setDetail("about");
              }}
              type="button"
            >
              <span>03</span> About the system
            </button>
          </aside>
        </div>
      )}

      {canvasOpen && collab.session && (
        <CanvasPanel
          session={collab.session}
          objects={collab.objects}
          message={collab.message}
          onClearMessage={collab.clearMessage}
          onClose={() => setCanvasOpen(false)}
          onCreate={collab.createObject}
          onDelete={collab.deleteObject}
          onUpdate={collab.updateObject}
        />
      )}
    </main>
  );
}

function SpacePlayer({
  player,
  local = false,
}: {
  player: PresencePlayer;
  local?: boolean;
}) {
  return (
    <div
      className={`space-player${local ? " is-local" : ""}${player.moving ? " is-moving" : ""}`}
      style={
        {
          left: player.x,
          top: player.y,
          "--visitor-color": player.color,
        } as React.CSSProperties
      }
    >
      <span className="player-name">
        {player.name}
        {local ? " · you" : ""}
      </span>
      <span className="player-avatar">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt="" />
        ) : (
          initials(player.name)
        )}
      </span>
      <span className={`player-direction direction-${player.direction}`} />
    </div>
  );
}

type CanvasTool = "select" | "text" | "draw" | "note";

interface CanvasPanelProps {
  session: NonNullable<ReturnType<typeof useCollabSpace>["session"]>;
  objects: CollabObject[];
  message: string;
  onClearMessage: () => void;
  onClose: () => void;
  onCreate: ReturnType<typeof useCollabSpace>["createObject"];
  onUpdate: ReturnType<typeof useCollabSpace>["updateObject"];
  onDelete: ReturnType<typeof useCollabSpace>["deleteObject"];
}

function CanvasPanel({
  session,
  objects,
  message,
  onClearMessage,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
}: CanvasPanelProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [tool, setTool] = useState<CanvasTool>("select");
  const [content, setContent] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<Array<{ x: number; y: number }>>([]);
  const dragRef = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const selected = objects.find((object) => object.id === selectedId) ?? null;
  const ownsSelected = selected?.visitorId === session.visitor.id;
  const canDeleteSelected = ownsSelected || session.visitor.isAdmin;

  const boardPoint = (event: ReactPointerEvent): { x: number; y: number } => {
    const rect = boardRef.current!.getBoundingClientRect();
    return {
      x: Math.max(
        0,
        Math.min(2000, ((event.clientX - rect.left) / rect.width) * 2000),
      ),
      y: Math.max(
        0,
        Math.min(1200, ((event.clientY - rect.top) / rect.height) * 1200),
      ),
    };
  };

  const pointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[data-canvas-object]")) return;
    const point = boardPoint(event);
    if (tool === "draw") {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrawing([point]);
    } else if ((tool === "text" || tool === "note") && content.trim()) {
      onCreate({
        type: tool,
        content: content.trim(),
        x: point.x,
        y: point.y,
        width: tool === "note" ? 260 : 300,
        height: tool === "note" ? 150 : 70,
        points: [],
        color: tool === "note" ? "sand" : "slate",
      });
      setContent("");
      setTool("select");
    } else if (tool === "select") setSelectedId(null);
  };

  const pointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const point = boardPoint(event);
    if (drawing.length) setDrawing((values) => [...values, point].slice(-160));
    if (dragRef.current)
      onUpdate(dragRef.current.id, {
        x: point.x - dragRef.current.offsetX,
        y: point.y - dragRef.current.offsetY,
      });
  };

  const pointerUp = () => {
    if (drawing.length > 1) {
      const xs = drawing.map((point) => point.x);
      const ys = drawing.map((point) => point.y);
      onCreate({
        type: "stroke",
        content: "",
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(24, Math.max(...xs) - Math.min(...xs)),
        height: Math.max(24, Math.max(...ys) - Math.min(...ys)),
        points: drawing,
        color: "clay",
      });
    }
    setDrawing([]);
    dragRef.current = null;
  };

  const pathFor = (points: Array<{ x: number; y: number }>) =>
    points
      .map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`)
      .join(" ");

  return (
    <section className="canvas-panel" aria-label="Collaborative canvas editor">
      <header>
        <div>
          <p>COLLAB CANVAS</p>
          <span>A shared space shaped by everyone who visits.</span>
        </div>
        <div className="canvas-identity">
          <span style={{ background: session.visitor.color }}>
            {initials(session.visitor.name)}
          </span>
          {session.visitor.name}
        </div>
        <button onClick={onClose} type="button">
          <X aria-hidden="true" /> Close
        </button>
      </header>
      <div
        className="canvas-board"
        ref={boardRef}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
      >
        <div className="canvas-invitation">LEAVE SOMETHING SMALL.</div>
        <svg
          aria-hidden="true"
          className="stroke-layer"
          viewBox="0 0 2000 1200"
          preserveAspectRatio="none"
        >
          {objects
            .filter((object) => object.type === "stroke")
            .map((object) => (
              <path
                className={`stroke-${object.color}`}
                d={pathFor(object.points)}
                key={object.id}
              />
            ))}
          {drawing.length > 1 && (
            <path className="stroke-clay is-draft" d={pathFor(drawing)} />
          )}
        </svg>
        {objects
          .filter((object) => object.type !== "stroke")
          .map((object) => (
            <div
              className={`canvas-object canvas-${object.type} color-${object.color}${selectedId === object.id ? " is-selected" : ""}`}
              data-canvas-object
              key={object.id}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedId(object.id);
                if (
                  tool === "select" &&
                  object.visitorId === session.visitor.id
                ) {
                  const point = boardPoint(event);
                  dragRef.current = {
                    id: object.id,
                    offsetX: point.x - object.x,
                    offsetY: point.y - object.y,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") setSelectedId(object.id);
              }}
              role="button"
              tabIndex={0}
              style={{
                left: `${(object.x / 2000) * 100}%`,
                top: `${(object.y / 1200) * 100}%`,
                width: `${(object.width / 2000) * 100}%`,
                minHeight: `${(object.height / 1200) * 100}%`,
              }}
            >
              <span>{object.content}</span>
              <small>
                {object.visitorName}
                {object.visitorId === session.visitor.id ? " · yours" : ""}
              </small>
            </div>
          ))}
      </div>

      <div className="canvas-toolbar" role="toolbar" aria-label="Canvas tools">
        {(
          [
            ["select", MousePointer2, "Select"],
            ["text", Type, "Text"],
            ["draw", Pencil, "Draw"],
            ["note", StickyNote, "Note"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            aria-pressed={tool === id}
            className={tool === id ? "is-active" : ""}
            key={id}
            onClick={() => setTool(id)}
            type="button"
          >
            <Icon aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {(tool === "text" || tool === "note") && (
        <div className="canvas-composer">
          <label htmlFor="canvas-content">
            {tool === "note" ? "Write a short note" : "Add a short line"}
          </label>
          <textarea
            autoFocus
            id="canvas-content"
            maxLength={160}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Keep it kind and concise."
            value={content}
          />
          <span>{content.length}/160 · then tap the canvas to place</span>
        </div>
      )}
      {selected && (
        <aside className="object-inspector">
          <button
            aria-label="Close selection"
            onClick={() => setSelectedId(null)}
            type="button"
          >
            <X />
          </button>
          <p>
            {ownsSelected
              ? "YOUR MARK"
              : `BY ${selected.visitorName.toUpperCase()}`}
          </p>
          {ownsSelected ? (
            <textarea
              maxLength={160}
              onChange={(event) =>
                onUpdate(selected.id, { content: event.target.value })
              }
              value={selected.content}
            />
          ) : (
            <blockquote>{selected.content}</blockquote>
          )}
          {canDeleteSelected && (
            <button
              className="delete-mark"
              onClick={() => {
                onDelete(selected.id);
                setSelectedId(null);
              }}
              type="button"
            >
              <Trash2 />
              {ownsSelected ? "Delete mark" : "Remove contribution"}
            </button>
          )}
        </aside>
      )}
      {message && (
        <button
          className="canvas-message"
          onClick={onClearMessage}
          type="button"
        >
          {message} <X />
        </button>
      )}
    </section>
  );
}

import {
  ArrowRight,
  Cpu,
  Database,
  FileDown,
  LayoutGrid,
  Lightbulb,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  Users,
  Vote,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { Editor } from "tldraw";

import { BrandMark } from "../components/brand-mark";
import { useTheme } from "../hooks/use-theme";
import { syncServerUrl } from "../lib/env";
import { WhiteboardCanvas } from "../features/whiteboard/whiteboard-canvas";
import { CursorReactions } from "../features/facilitation/cursor-reactions";
import {
  REACTION_CONFIG,
  triggerCanvasReaction,
  type ReactionKind,
} from "../features/facilitation/reaction-constants";
import { DotVoting } from "../features/facilitation/dot-voting";
import { populateDemoBoard } from "../features/boards/demo-board";

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [latencyMs, setLatencyMs] = useState<number | null>(12);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [isVotingOpen, setIsVotingOpen] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  // Measure latency to live sync server if available
  useEffect(() => {
    if (!syncServerUrl) return;

    const ping = async () => {
      const start = performance.now();
      try {
        const res = await fetch(`${syncServerUrl}/health`, { cache: "no-store" });
        if (res.ok) setLatencyMs(Math.round(performance.now() - start));
      } catch {
        setLatencyMs(null);
      }
    };
    void ping();
    const interval = setInterval(ping, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCanvas = () => {
    if (!editor) return;
    editor.selectAll();
    const ids = editor.getSelectedShapeIds();
    if (ids.length > 0) {
      editor.deleteShapes(ids);
    }
    populateDemoBoard(editor);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-white font-sans overflow-x-hidden">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-panel/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-[11px] font-semibold text-muted sm:inline-block">
              Collaborative Whiteboard
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-6">
            <a
              className="hidden md:inline-flex text-sm font-medium text-muted hover:text-ink transition"
              href="#sandbox"
            >
              Interactive Canvas
            </a>
            <a
              className="hidden md:inline-flex text-sm font-medium text-muted hover:text-ink transition"
              href="#features"
            >
              Features
            </a>
            <a
              className="hidden md:inline-flex text-sm font-medium text-muted hover:text-ink transition"
              href="#templates"
            >
              Templates
            </a>

            <button
              aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
              className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-muted hover:text-ink transition"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>

            <Link
              className="hidden sm:flex h-9 items-center rounded-lg border border-line bg-panel px-3.5 text-xs font-semibold text-ink hover:bg-hover transition"
              to="/login"
            >
              Sign In
            </Link>

            <Link
              className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-4 text-xs font-semibold text-white hover:bg-accent-strong transition shadow-sm"
              to="/demo"
            >
              <Zap className="size-3.5" />
              <span>Launch Sandbox</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-14 pb-16 sm:px-6 sm:pt-20 sm:pb-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3.5 py-1 text-xs font-medium text-muted shadow-xs">
            <span className="text-ink font-semibold">Real-Time Sync Engine</span>
            <span className="text-muted">·</span>
            <span className="font-mono text-[11px]">{latencyMs !== null ? `${latencyMs}ms latency` : "Optimistic edge sync"}</span>
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-ink leading-[1.15]">
            Visual Collaboration Built for Modern Product Teams
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
            The high-performance infinite whiteboard powered by <strong>tldraw</strong>, <strong>Cloudflare Durable Objects</strong>, and <strong>Supabase</strong>. Brainstorm ideas, diagram architectures, and vote on action items in real time.
          </p>

          {/* Primary Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong transition"
              to="/demo"
            >
              <Zap className="size-4" />
              <span>Open Instant Sandbox</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              className="flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-5 text-sm font-semibold text-ink hover:bg-hover transition"
              to="/dashboard"
            >
              <LayoutGrid className="size-4 text-muted" />
              <span>Team Workspace</span>
            </Link>
          </div>

          {/* Key Value Props Pill Bar */}
          <div className="mt-10 flex flex-wrap justify-center gap-2 text-xs font-medium text-muted">
            <span className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1 text-ink">
              <Zap className="size-3.5 text-accent" />
              <span>Zero-Install Sandbox</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1 text-ink">
              <Database className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Edge SQLite Durability</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1 text-ink">
              <Users className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>Multi-User Presence</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1 text-ink">
              <Vote className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span>Agile Dot Voting</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1 text-ink">
              <ShieldCheck className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>PostgreSQL RLS Security</span>
            </span>
          </div>
        </div>
      </section>

      {/* Live Real Canvas Sandbox Section */}
      <section className="px-4 py-12 sm:px-6 bg-panel/50 border-y border-line" id="sandbox">
        <div className="mx-auto max-w-6xl">
          {/* Header Controls for Live Sandbox */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
                  Interactive Preview
                </span>
                <span className="inline-flex items-center rounded-full border border-line bg-panel px-2.5 py-0.5 text-[11px] font-medium text-muted">
                  Live Canvas Active
                </span>
              </div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-ink">
                Try the Live Canvas Below
              </h2>
              <p className="text-sm text-muted">
                Fully functional whiteboard. Draw with the pen, move sticky notes, cast dot votes, or trigger live reactions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Reactions */}
              <div className="flex items-center gap-1 rounded-lg border border-line bg-panel p-1">
                <span className="px-2 text-xs font-medium text-muted">React:</span>
                {(Object.keys(REACTION_CONFIG) as ReactionKind[]).map((kind) => {
                  const { icon: Icon, label, color } = REACTION_CONFIG[kind];
                  return (
                    <button
                      aria-label={`Send ${label} reaction`}
                      className="grid size-7 place-items-center rounded hover:bg-hover active:scale-95 transition"
                      key={kind}
                      onClick={() => triggerCanvasReaction(kind)}
                      title={label}
                      type="button"
                    >
                      <Icon className={`size-3.5 ${color}`} />
                    </button>
                  );
                })}
              </div>

              {/* Dot Voting Toggle */}
              <button
                className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                  isVotingOpen
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-panel text-ink hover:bg-hover"
                }`}
                onClick={() => setIsVotingOpen((v) => !v)}
                type="button"
              >
                <Vote className="size-3.5 text-amber-500" />
                <span>{isVotingOpen ? "Close Voting" : "Dot Voting"}</span>
              </button>

              {/* Reset Canvas */}
              <button
                className="grid size-9 place-items-center rounded-lg border border-line bg-panel text-muted hover:text-ink hover:bg-hover transition"
                onClick={handleResetCanvas}
                title="Reset sample shapes"
                type="button"
              >
                <RotateCcw className="size-3.5" />
              </button>

              {/* Open in Fullscreen */}
              <Link
                className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-panel px-3 text-xs font-semibold text-ink hover:bg-hover transition"
                to="/demo"
              >
                <span>Full Screen</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>

          {/* Embedded Real tldraw Canvas */}
          <div className="relative h-[560px] sm:h-[620px] w-full rounded-2xl border border-line bg-canvas shadow-sm overflow-hidden">
            <WhiteboardCanvas
              boardId="landing-preview-board"
              persistenceKey="collab-canvas-landing-preview"
              onMount={(mountedEditor) => {
                editorRef.current = mountedEditor;
                setEditor(mountedEditor);
                setTimeout(() => {
                  populateDemoBoard(mountedEditor);
                }, 100);
              }}
            />

            {/* Live Reactions Emitter Overlay */}
            <CursorReactions editor={editor} hideToolbar={true} />

            {/* Live Dot Voting Facilitation Modal */}
            <DotVoting
              editor={editor}
              isOpen={isVotingOpen}
              onClose={() => setIsVotingOpen(false)}
            />
          </div>
        </div>
      </section>

      {/* Production Features Grid */}
      <section className="px-4 py-20 sm:px-6" id="features">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
              Architecture &amp; Capabilities
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">
              Enterprise Whiteboard Architecture
            </h2>
            <p className="mt-2 text-sm text-muted">
              Built for speed, low latency, and dependable data persistence for teams of all sizes.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <Palette className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">60 FPS Infinite Canvas</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Vector drawing, smart sticky notes, automatic grid snapping, shapes, connectors, and rich typography powered by tldraw.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                Freehand Pen · Shapes · Connectors
              </div>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Multi-Cursor Presence</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Smooth cursor interpolation with user labels, laser presentation pointer, follow-me presenter camera lock, and synchronized viewport.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                Live Cursors · Laser Pointer · Follow Mode
              </div>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Vote className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Agile Dot Voting</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Facilitate sprint retrospectives and design reviews. Cast votes directly on sticky notes, tally results, and view live vote rankings.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                Facilitation · Leaderboard · Sprint Retro
              </div>
            </div>

            {/* Feature 4 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <LayoutGrid className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Tidy &amp; Organize</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Clean up brainstorming chaos in one click. Align scattered sticky notes into geometric grids or sort notes automatically by color.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                Tidy to Grid · Sort by Color
              </div>
            </div>

            {/* Feature 5 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FileDown className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Vector &amp; HTML Export</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Export high-resolution visual PNGs, vector PDFs for documentation, or structured WCAG 2.2 accessible companion HTML pages.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                PNG · Vector PDF · Accessible HTML
              </div>
            </div>

            {/* Feature 6 */}
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs hover:border-line-strong transition">
              <div className="grid size-10 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Edge SQLite &amp; Postgres RLS</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Decentralized room state stored in Cloudflare Durable Objects backed by SQLite, paired with Supabase PostgreSQL Row-Level Security.
              </p>
              <div className="mt-4 border-t border-line pt-3 font-mono text-[11px] text-muted">
                Cloudflare Workers · Durable Objects · Supabase
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="px-4 py-16 sm:px-6 bg-panel/30 border-t border-line" id="templates">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs font-semibold text-accent uppercase tracking-wider">
              Templates
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">
              Ready-Made Starters
            </h2>
            <p className="mt-2 text-sm text-muted">
              Jumpstart any collaborative session in seconds with standardized team frameworks.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs">
              <div className="grid size-10 place-items-center rounded-lg bg-accent/10 text-accent">
                <RotateCcw className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">Sprint Retrospective</h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Standard 3-column template for What Went Well, What Could Improve, and Action Items.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-accent hover:bg-hover transition"
                to="/demo"
              >
                <span>Launch Template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs">
              <div className="grid size-10 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Cpu className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">System Architecture</h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Pre-wired diagram components for Clients, API Gateways, Edge Workers, and Databases.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-accent hover:bg-hover transition"
                to="/demo"
              >
                <span>Launch Template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="rounded-2xl border border-line bg-panel p-6 shadow-xs">
              <div className="grid size-10 place-items-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Lightbulb className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">Brainstorm &amp; Mindmap</h3>
              <p className="mt-1.5 text-xs text-muted leading-relaxed">
                Radial idea mapping nodes with categorized sticky notes and designated voting areas.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-accent hover:bg-hover transition"
                to="/demo"
              >
                <span>Launch Template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Production Call to Action */}
      <section className="px-4 py-16 sm:px-6 border-t border-line bg-panel">
        <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-canvas p-8 sm:p-10 text-center shadow-xs">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink">
            Start Collaborating in Seconds
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm sm:text-base text-muted leading-relaxed">
            No signup, no credit card, and zero friction. Create an instant whiteboard or sign in to save boards to your team workspace.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              className="flex h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-sm hover:bg-accent-strong transition"
              to="/demo"
            >
              <Zap className="size-4" />
              <span>Launch Instant Board</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              className="flex h-11 items-center gap-2 rounded-xl border border-line bg-panel px-5 text-sm font-semibold text-ink hover:bg-hover transition"
              to="/dashboard"
            >
              <LayoutGrid className="size-4 text-muted" />
              <span>Team Workspace</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="border-t border-line bg-panel px-4 py-8 sm:px-6 text-xs text-muted">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span>— The Distributed Real-Time Collaborative Whiteboard</span>
          </div>
          <div className="flex items-center gap-6 font-medium text-ink">
            <Link className="hover:text-accent transition" to="/demo">Sandbox</Link>
            <Link className="hover:text-accent transition" to="/dashboard">Workspace</Link>
            <Link className="hover:text-accent transition" to="/login">Sign In</Link>
            <Link className="hover:text-accent transition" to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

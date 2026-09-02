import {
  Activity,
  ArrowRight,
  Cpu,
  Database,
  FileDown,
  Flame,
  Heart,
  LayoutGrid,
  Lightbulb,
  Moon,
  Palette,
  Rocket,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  ThumbsUp,
  Timer,
  Users,
  Vote,
  Wifi,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "react-router";

import { BrandMark } from "../components/brand-mark";
import { useTheme } from "../hooks/use-theme";
import { syncServerUrl } from "../lib/env";

type ReactionKind = "rocket" | "fire" | "heart" | "zap" | "sparkles";

interface FloatingReaction {
  id: number;
  kind: ReactionKind;
  x: number;
}

const REACTION_CONFIG: Record<
  ReactionKind,
  { icon: ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  rocket: { icon: Rocket, color: "text-emerald-500", bg: "bg-emerald-500/15 border-emerald-500/30" },
  fire: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/15 border-orange-500/30" },
  heart: { icon: Heart, color: "text-pink-500", bg: "bg-pink-500/15 border-pink-500/30" },
  zap: { icon: Zap, color: "text-amber-500", bg: "bg-amber-500/15 border-amber-500/30" },
  sparkles: { icon: Sparkles, color: "text-cyan-500", bg: "bg-cyan-500/15 border-cyan-500/30" },
};

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const [latencyMs, setLatencyMs] = useState<number | null>(12);
  const [interactiveNotes, setInteractiveNotes] = useState([
    {
      id: "1",
      title: "Sprint Retro",
      text: "Shipped edge-native sync engine ahead of schedule with zero regressions.",
      color: "bg-emerald-300 text-emerald-950",
      votes: 12,
      kind: "rocket" as ReactionKind,
    },
    {
      id: "2",
      title: "Design System",
      text: "Unified dark/light tokens with WCAG 2.2 AA accessibility standards.",
      color: "bg-cyan-300 text-cyan-950",
      votes: 8,
      kind: "sparkles" as ReactionKind,
    },
    {
      id: "3",
      title: "Architecture",
      text: "Durable Object per board with embedded SQLite local transactions.",
      color: "bg-amber-300 text-amber-950",
      votes: 15,
      kind: "zap" as ReactionKind,
    },
    {
      id: "4",
      title: "Team Action",
      text: "Agile dot voting directly on brainstorm stickies with real-time tallying.",
      color: "bg-pink-300 text-pink-950",
      votes: 9,
      kind: "fire" as ReactionKind,
    },
  ]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const reactionCounterRef = useRef(0);

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

  const triggerReaction = useCallback((kind: ReactionKind) => {
    reactionCounterRef.current += 1;
    const id = reactionCounterRef.current;
    const x = (id * 23) % 80 + 10;
    setFloatingReactions((prev) => [...prev, { id, kind, x }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
    }, 1800);
  }, []);

  const addVote = (noteId: string) => {
    setInteractiveNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, votes: note.votes + 1 } : note
      )
    );
    triggerReaction("zap");
  };

  return (
    <div className="min-h-screen bg-canvas text-ink selection:bg-accent selection:text-white font-sans overflow-x-hidden">
      {/* Top Notification Ribbon */}
      <div className="border-b-2 border-line bg-panel px-4 py-2 text-xs font-mono backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold text-accent">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              COLLABCANVAS REALTIME ENGINE ONLINE
            </span>
            <span className="hidden md:inline text-muted">|</span>
            <span className="hidden md:flex items-center gap-1 text-muted">
              <Wifi className="size-3 text-emerald-500" />
              {latencyMs !== null ? `${latencyMs}ms Edge RTT` : "Instant local optimistic sync"}
            </span>
          </div>
          <div className="flex items-center gap-3 font-semibold">
            <span className="hidden sm:inline text-muted">No sign-up wall to test:</span>
            <Link
              className="rounded bg-accent/10 px-2 py-0.5 text-accent hover:bg-accent hover:text-white transition flex items-center gap-1"
              to="/demo"
            >
              <Zap className="size-3" />
              <span>Instant Sandbox →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main SaaS Navigation Header */}
      <header className="sticky top-0 z-40 border-b-2 border-line bg-panel/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="hidden rounded-full border border-line bg-canvas px-2.5 py-0.5 font-mono text-[11px] font-black uppercase tracking-wider text-accent sm:inline-block">
              SaaS Whiteboard
            </span>
          </div>

          <nav className="flex items-center gap-2 sm:gap-5">
            <a
              className="hidden md:inline-flex text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition"
              href="#features"
            >
              Features
            </a>
            <a
              className="hidden md:inline-flex text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition"
              href="#templates"
            >
              Templates
            </a>
            <a
              className="hidden lg:inline-flex text-xs font-bold uppercase tracking-wider text-muted hover:text-ink transition"
              href="#interactive-demo"
            >
              Live Demo
            </a>

            <button
              aria-label={`Use ${theme === "light" ? "dark" : "light"} mode`}
              className="grid size-9 place-items-center rounded-xl border-2 border-line bg-panel text-muted hover:border-accent hover:text-ink transition"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>

            <Link
              className="hidden sm:flex h-9 items-center rounded-xl border-2 border-line bg-panel px-3.5 text-xs font-bold text-ink hover:border-accent hover:bg-hover transition"
              to="/login"
            >
              Sign In
            </Link>

            <Link
              className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-white shadow-md hover:bg-accent-strong transition"
              to="/demo"
            >
              <Zap className="size-3.5" />
              <span>Start Free (Instant)</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24">
        {/* Background Grid Pattern */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:28px_28px]" />

        <div className="mx-auto max-w-5xl text-center">
          {/* Tag Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-line bg-panel px-4 py-1.5 text-xs font-mono font-bold shadow-sm">
            <Sparkles className="size-3.5 text-accent animate-spin" />
            <span className="text-ink">Next-Gen Real-Time Whiteboard for Teams</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-600 font-extrabold text-[10px]">
              60 FPS
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl lg:text-[54px] leading-tight">
            <span className="block text-ink">Think Visually.</span>
            <span className="maximalist-gradient-text block font-black uppercase">
              Collaborate in Real Time.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
            The ultra-fast infinite collaborative whiteboard powered by <strong>tldraw</strong> and{" "}
            <strong>Cloudflare Edge</strong>. Brainstorm ideas, design architecture diagrams, run agile
            retrospectives, and vote with your team at zero latency.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link
              className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-7 text-sm font-bold text-white shadow-lg hover:bg-accent-strong hover:scale-105 active:scale-95 transition-all neo-box-shadow"
              to="/demo"
            >
              <Zap className="size-4" />
              <span>Launch Instant Board (Free)</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-panel px-6 text-sm font-bold text-ink hover:border-accent hover:bg-hover hover:scale-105 active:scale-95 transition-all"
              to="/dashboard"
            >
              <LayoutGrid className="size-4 text-accent" />
              <span>Open Workspace</span>
            </Link>
          </div>

          {/* Feature Badge Strip */}
          <div className="mt-10 flex flex-wrap justify-center gap-2 sm:gap-3 text-xs font-mono font-semibold text-muted">
            <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-panel px-3.5 py-1 text-ink shadow-sm">
              <Zap className="size-3 text-accent" />
              <span>&lt;15ms Latency</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-panel px-3.5 py-1 text-ink shadow-sm">
              <Database className="size-3 text-emerald-500" />
              <span>SQLite Cloud Sync</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-panel px-3.5 py-1 text-ink shadow-sm">
              <Users className="size-3 text-blue-500" />
              <span>Multi-Cursor Presence</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-panel px-3.5 py-1 text-ink shadow-sm">
              <Vote className="size-3 text-purple-500" />
              <span>Built-In Dot Voting</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border-2 border-line bg-panel px-3.5 py-1 text-ink shadow-sm">
              <Timer className="size-3 text-amber-500" />
              <span>Sprint Meeting Timer</span>
            </span>
          </div>
        </div>
      </section>

      {/* Infinite Product Marquee Banner */}
      <div className="border-y-2 border-line bg-accent/10 py-3 overflow-hidden select-none">
        <div className="animate-marquee font-mono text-xs font-black uppercase tracking-widest text-accent flex items-center gap-8">
          <span>60FPS INFINITE CANVAS</span>
          <span>•</span>
          <span>RICH TLDRAW DRAWING TOOLS</span>
          <span>•</span>
          <span>MULTIPLAYER CURSORS &amp; LASER POINTER</span>
          <span>•</span>
          <span>AGILE DOT VOTING &amp; LEADERBOARD</span>
          <span>•</span>
          <span>SYNCHRONIZED MEETING TIMER</span>
          <span>•</span>
          <span>PRO PNG, PDF &amp; ACCESSIBLE HTML EXPORTS</span>
          <span>•</span>
          <span>EDGE SQLITE STATE DURABILITY</span>
          <span>•</span>
          <span>INSTANT ZERO-FRICTION GUEST SANDBOX</span>
          <span>•</span>
          <span>60FPS INFINITE CANVAS</span>
          <span>•</span>
          <span>RICH TLDRAW DRAWING TOOLS</span>
          <span>•</span>
        </div>
      </div>

      {/* Live Interactive Hero Playground Widget */}
      <section className="px-4 py-16 sm:px-6 bg-panel/40 border-b-2 border-line" id="interactive-demo">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
                01 / Interactive Product Preview
              </span>
              <h2 className="mt-1 text-xl sm:text-2xl font-black text-ink">
                Try the Live Canvas Reaction &amp; Voting System
              </h2>
              <p className="mt-1 text-sm text-muted">
                Experience the sticky notes, live reactions, and dot voting tally that teams use inside CollabCanvas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">Drop live reaction:</span>
              {(Object.keys(REACTION_CONFIG) as ReactionKind[]).map((kind) => {
                const { icon: Icon, color } = REACTION_CONFIG[kind];
                return (
                  <button
                    aria-label={`Trigger ${kind} reaction`}
                    className="grid size-9 place-items-center rounded-xl border-2 border-line bg-panel hover:scale-110 active:scale-95 transition hover:border-accent"
                    key={kind}
                    onClick={() => triggerReaction(kind)}
                    type="button"
                  >
                    <Icon className={`size-4.5 ${color}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Board Surface */}
          <div className="relative min-h-[380px] rounded-3xl border-2 border-line bg-canvas p-6 sm:p-8 shadow-xl overflow-hidden">
            {/* Background Grid Pattern */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#94a3b830_1px,transparent_1px)] bg-[size:20px_20px]" />

            {/* Floating Reactions overlay */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {floatingReactions.map((item) => {
                const { icon: Icon, color, bg } = REACTION_CONFIG[item.kind];
                return (
                  <div
                    className="animate-reaction absolute bottom-4 select-none"
                    key={item.id}
                    style={{ left: `${item.x}%` }}
                  >
                    <div className={`grid size-11 place-items-center rounded-full border shadow-xl backdrop-blur-md ${bg}`}>
                      <Icon className={`size-6 ${color}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Interactive Sticky Notes Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
              {interactiveNotes.map((note) => {
                const { icon: NoteIcon } = REACTION_CONFIG[note.kind];
                return (
                  <div
                    className={`rounded-2xl p-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl ${note.color} neo-box-shadow flex flex-col justify-between min-h-[170px] border-2 border-black/20`}
                    key={note.id}
                  >
                    <div>
                      <span className="rounded-full bg-black/15 px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                        {note.title}
                      </span>
                      <p className="mt-2 font-semibold text-sm leading-snug">{note.text}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-black/15 pt-2">
                      <span className="font-mono text-xs font-bold flex items-center gap-1.5">
                        <NoteIcon className="size-3.5" />
                        <span>{note.votes} votes</span>
                      </span>
                      <button
                        className="rounded-xl bg-black/10 px-2.5 py-1 text-xs font-bold hover:bg-black/20 active:scale-90 transition flex items-center gap-1"
                        onClick={() => addVote(note.id)}
                        type="button"
                      >
                        <ThumbsUp className="size-3" />
                        <span>+1</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Quick Launch Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border-2 border-line bg-panel/95 p-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent font-bold">
                  <Activity className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-ink">Ready for the full whiteboard?</p>
                  <p className="text-[11px] text-muted">Full tldraw canvas with freehand pen, shapes, arrows, templates, and exports.</p>
                </div>
              </div>
              <Link
                className="flex h-9 items-center gap-1.5 rounded-xl bg-accent px-4 text-xs font-bold text-white hover:bg-accent-strong transition"
                to="/demo"
              >
                <span>Open Full Whiteboard</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core SaaS Features Grid */}
      <section className="px-4 py-20 sm:px-6" id="features">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              02 / Product Features
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-ink">
              Everything Your Team Needs to Build Faster
            </h2>
            <p className="mt-2 text-sm text-muted">
              Designed from the ground up for modern engineering, product, and agile design teams.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Drawing & Infinite Canvas */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-accent hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent/10 text-accent">
                <Palette className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Infinite 60FPS Canvas</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Smooth vector drawing, smart sticky notes, automatic grid alignment, shapes, connectors, and rich typography powered by tldraw.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-accent font-semibold border border-line">
                Smart Arrow Connectors + Shapes
              </div>
            </div>

            {/* Card 2: Live Multiplayer Presence */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-amber-500 hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/10 text-amber-500">
                <Users className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Multi-Cursor Presence</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                See teammate cursors with individual custom colors, laser pointer presentation mode, follow-me presenter camera lock, and live audio chime reactions.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-amber-500 font-semibold border border-line">
                Laser Pointer + Follow Mode
              </div>
            </div>

            {/* Card 3: Agile Facilitation Tools */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-emerald-500 hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <Vote className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Dot Voting &amp; Meeting Timer</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Run structured agile sprint retrospectives. Cast dot votes directly on sticky notes, view real-time leaderboards, and keep meetings on time with synchronized timers.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-emerald-500 font-semibold border border-line">
                Dot Voting + Audio Chime Timer
              </div>
            </div>

            {/* Card 4: Tidy Shapes & Color Sorter */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-pink-500 hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-pink-500/10 text-pink-500">
                <LayoutGrid className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Auto-Tidy &amp; Color Sorting</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                One-click layout cleanup turns chaotic brainstorm sticky notes into perfectly spaced geometric grids or organizes notes by color automatically.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-pink-500 font-semibold border border-line">
                Tidy to Grid + Color Sorter
              </div>
            </div>

            {/* Card 5: Professional Exports */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-indigo-500 hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                <FileDown className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Pro PNG, PDF &amp; HTML Export</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Export high-resolution visual PNGs, crisp vector PDFs for presentations, or structured WCAG 2.2 accessible companion HTML documents.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-indigo-500 font-semibold border border-line">
                PDF + High-Res PNG + HTML
              </div>
            </div>

            {/* Card 6: Edge State Resiliency */}
            <div className="rounded-3xl border-2 border-line bg-panel p-6 shadow-sm hover:border-purple-500 hover:shadow-lg transition">
              <div className="grid size-11 place-items-center rounded-2xl bg-purple-500/10 text-purple-500">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-bold text-ink">Offline-First &amp; Cloud RLS</h3>
              <p className="mt-2 text-xs text-muted leading-relaxed">
                Keep working seamlessly even if offline. Reconnect and sync with Cloudflare Durable Objects and Supabase PostgreSQL Row-Level Security.
              </p>
              <div className="mt-4 rounded-xl bg-canvas p-2.5 font-mono text-[11px] text-purple-500 font-semibold border border-line">
                Offline Cache + Postgres RLS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Templates Showcase Section */}
      <section className="px-4 py-20 sm:px-6 bg-panel/30 border-t-2 border-line" id="templates">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-accent">
              03 / Ready-Made Starters
            </span>
            <h2 className="mt-2 text-2xl sm:text-3xl font-black text-ink">
              Jumpstart Any Session with Templates
            </h2>
            <p className="mt-2 text-sm text-muted">
              Pre-built layouts to organize sprint retrospectives, product roadmaps, and architecture diagrams.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <div className="rounded-3xl border-2 border-line bg-panel p-6 neo-box-shadow">
              <div className="grid size-11 place-items-center rounded-2xl bg-accent/15 text-accent">
                <RotateCcw className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">Sprint Retrospective</h3>
              <p className="mt-1 text-xs text-muted">
                3-column board with What Went Well, What Could Improve, and Action Items.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-accent hover:border-accent transition"
                to="/demo"
              >
                <span>Use this template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="rounded-3xl border-2 border-line bg-panel p-6 neo-box-shadow">
              <div className="grid size-11 place-items-center rounded-2xl bg-amber-500/15 text-amber-500">
                <Cpu className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">System Architecture</h3>
              <p className="mt-1 text-xs text-muted">
                Client, API Gateway, Distributed Actor, Database, and Cache diagram cards.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-accent hover:border-accent transition"
                to="/demo"
              >
                <span>Use this template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>

            <div className="rounded-3xl border-2 border-line bg-panel p-6 neo-box-shadow">
              <div className="grid size-11 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-500">
                <Lightbulb className="size-5" />
              </div>
              <h3 className="mt-3 text-base font-bold text-ink">Brainstorm &amp; Mindmap</h3>
              <p className="mt-1 text-xs text-muted">
                Central theme node with color-coded idea clusters and dot voting spots.
              </p>
              <Link
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-1.5 text-xs font-bold text-accent hover:border-accent transition"
                to="/demo"
              >
                <span>Use this template</span>
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Maximalist SaaS CTA */}
      <section className="px-4 py-16 sm:px-6 border-t-2 border-line bg-panel">
        <div className="mx-auto max-w-4xl rounded-3xl border-2 border-line bg-canvas p-8 sm:p-12 text-center shadow-2xl relative overflow-hidden neo-box-shadow">
          <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -left-16 -bottom-16 size-48 rounded-full bg-pink-500/20 blur-3xl" />

          <h2 className="text-2xl sm:text-3xl font-black text-ink">
            Start Collaborating in 5 Seconds
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-muted leading-relaxed">
            No signup, no credit card, and zero setup required. Open a canvas, share the link with your team, and start building.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              className="flex h-12 items-center gap-2 rounded-2xl bg-accent px-8 text-sm font-bold text-white shadow-lg hover:bg-accent-strong hover:scale-105 active:scale-95 transition-all neo-box-shadow"
              to="/demo"
            >
              <Zap className="size-4" />
              <span>Create Instant Canvas</span>
              <ArrowRight className="size-4" />
            </Link>

            <Link
              className="flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-panel px-6 text-sm font-bold text-ink hover:border-accent hover:bg-hover transition-all"
              to="/dashboard"
            >
              <LayoutGrid className="size-4 text-accent" />
              <span>Workspace Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SaaS Product Footer */}
      <footer className="border-t-2 border-line bg-panel px-4 py-8 sm:px-6 text-xs text-muted">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrandMark />
            <span>— The Real-Time Collaborative Whiteboard</span>
          </div>
          <div className="flex items-center gap-5 font-semibold text-ink">
            <Link className="hover:text-accent transition" to="/demo">Instant Sandbox</Link>
            <Link className="hover:text-accent transition" to="/dashboard">Workspace</Link>
            <Link className="hover:text-accent transition" to="/login">Sign In</Link>
            <Link className="hover:text-accent transition" to="/register">Create Account</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

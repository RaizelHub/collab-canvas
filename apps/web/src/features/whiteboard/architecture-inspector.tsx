import {
  Check,
  Code2,
  Cpu,
  Database,
  Radio,
  Server,
  ShieldCheck,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";

interface ArchitectureInspectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ArchitectureInspector({
  isOpen,
  onClose,
}: ArchitectureInspectorProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "durable-objects" | "security" | "storage"
  >("overview");

  if (!isOpen) return null;

  return (
    <div
      aria-labelledby="arch-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
    >
      <div className="flex h-[90vh] max-h-[780px] w-full max-w-4xl flex-col rounded-xl border border-line bg-panel shadow-2xl overflow-hidden text-ink">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
              <Cpu className="size-4" />
            </div>
            <div>
              <h2
                className="text-sm font-semibold text-ink"
                id="arch-dialog-title"
              >
                System Architecture & Edge Infrastructure
              </h2>
              <p className="text-[11px] text-muted">
                Distributed real-time collaboration with Cloudflare Workers &
                Supabase
              </p>
            </div>
          </div>
          <button
            aria-label="Close architecture inspector"
            className="grid size-8 place-items-center rounded-lg text-muted hover:bg-hover hover:text-ink transition"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Tab Navigation */}
        <nav className="flex shrink-0 gap-1 border-b border-line bg-canvas/40 px-5 pt-2">
          {[
            { id: "overview", label: "Overview & Data Flow", icon: Workflow },
            {
              id: "durable-objects",
              label: "Durable Objects & SQLite",
              icon: Server,
            },
            { id: "security", label: "Security & Auth RLS", icon: ShieldCheck },
            { id: "storage", label: "R2 Private Assets", icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                className={`flex items-center gap-2 border-b-2 px-3.5 py-2 text-xs font-medium transition ${
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:text-ink"
                }`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                type="button"
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-line bg-canvas p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                    <Radio className="size-4" />
                    <span>Client Layer</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">
                    React 19 + tldraw
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    Optimistic local state, TLShape tree diffing, spatial
                    awareness, and keyboard-first accessibility.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-canvas p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                    <Zap className="size-4" />
                    <span>Edge Compute</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">
                    Cloudflare Workers
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    60-second single-use ticket exchange, WebSocket proxying,
                    and role-enforced message gating.
                  </p>
                </div>

                <div className="rounded-lg border border-line bg-canvas p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                    <Server className="size-4" />
                    <span>Authoritative State</span>
                  </div>
                  <h3 className="mt-2 text-sm font-medium">
                    Durable Object + SQLite
                  </h3>
                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    One coordinator instance per active board with hibernating
                    sockets and transactional document sync.
                  </p>
                </div>
              </div>

              {/* Data Flow Diagram Card */}
              <div className="rounded-lg border border-line bg-canvas/70 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                  End-to-End WebSocket Handshake Flow
                </h3>
                <div className="mt-3 space-y-2 font-mono text-[11px]">
                  <div className="flex items-center gap-2 rounded bg-panel p-2.5 border border-line/60">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent font-bold">
                      1
                    </span>
                    <span className="text-ink font-semibold">
                      HTTPS Ticket Request:
                    </span>
                    <span className="text-muted">
                      Browser requests ticket via Supabase JWT auth token
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded bg-panel p-2.5 border border-line/60">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent font-bold">
                      2
                    </span>
                    <span className="text-ink font-semibold">
                      Ticket Verification:
                    </span>
                    <span className="text-muted">
                      Worker validates permissions, queries RLS role, returns
                      60s ticket
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded bg-panel p-2.5 border border-line/60">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent font-bold">
                      3
                    </span>
                    <span className="text-ink font-semibold">
                      WebSocket Connection:
                    </span>
                    <span className="text-muted">
                      Client upgrades to WS, Durable Object wakes up and
                      hydrates from SQLite
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded bg-panel p-2.5 border border-line/60">
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-accent font-bold">
                      4
                    </span>
                    <span className="text-ink font-semibold">
                      Delta Broadcast:
                    </span>
                    <span className="text-muted">
                      Shape mutations broadcast to all connected peers in
                      &lt;15ms
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "durable-objects" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <h3 className="text-sm font-semibold text-ink">
                  Why Durable Objects + Embedded SQLite?
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Traditional collaborative boards rely on heavy Redis clusters
                  or centralized servers. Durable Objects give each room an
                  isolated actor near the users, combining memory-speed
                  broadcast with transactional SQLite disk durability.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded border border-line/70 bg-panel p-3">
                    <p className="font-semibold text-accent">
                      💤 Hibernatable WebSockets
                    </p>
                    <p className="mt-1 text-muted">
                      When users are idle, Cloudflare freezes DO execution in
                      memory while maintaining open TCP/WebSocket connections.
                      Zero compute billing during pauses.
                    </p>
                  </div>
                  <div className="rounded border border-line/70 bg-panel p-3">
                    <p className="font-semibold text-emerald-500">
                      🔒 Conflict-Free Ordering
                    </p>
                    <p className="mt-1 text-muted">
                      Single-threaded actor concurrency ensures all document
                      mutations are sequenced deterministically without complex
                      distributed locks.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <h3 className="text-sm font-semibold text-ink">
                  Multi-Tier Security & Zero-Trust Authorization
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-muted">
                  <li className="flex items-start gap-2">
                    <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>
                      <strong>PostgreSQL Row Level Security (RLS):</strong>{" "}
                      Board metadata, memberships, and invitations are enforced
                      at the database level.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>
                      <strong>Server-Enforced Roles:</strong> Viewers are
                      strictly blocked from writing strokes inside the Durable
                      Object sync protocol.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                    <span>
                      <strong>Content Sniffing & Magic Bytes:</strong> Uploads
                      undergo MIME validation and magic-byte checks before
                      storage in R2.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === "storage" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-line bg-canvas p-4">
                <h3 className="text-sm font-semibold text-ink">
                  Cloudflare R2 Object Storage & Snapshots
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Images and manual snapshot backups are stored in private R2
                  buckets. Assets are delivered using HMAC-signed, time-expiring
                  URLs to prevent unauthorized hotlinking.
                </p>
                <div className="mt-3 rounded bg-panel p-3 font-mono text-[11px] text-muted border border-line/70">
                  <p className="text-ink font-semibold">Zero Egress Fees:</p>
                  <p className="mt-0.5">
                    R2 allows massive board snapshot retention and
                    multi-megabyte media storage without runaway bandwidth
                    costs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex h-12 shrink-0 items-center justify-between border-t border-line bg-canvas/40 px-5 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <Code2 className="size-3.5 text-accent" />
            <span>
              Built with TypeScript, React 19, Cloudflare Workers &amp; Supabase
            </span>
          </div>
          <button
            className="rounded border border-line bg-panel px-3 py-1 text-xs font-medium text-ink hover:bg-hover transition"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

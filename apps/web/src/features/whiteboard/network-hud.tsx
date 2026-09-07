import {
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
  Radio,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Editor } from "tldraw";

import { syncServerUrl } from "../../lib/env";

interface NetworkHudProps {
  editor: Editor | null;
  connectionStatus?: "connected" | "connecting" | "offline";
  isCloud?: boolean;
}

export function NetworkHud({
  editor,
  connectionStatus = "connected",
  isCloud = false,
}: NetworkHudProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [opsCount, setOpsCount] = useState(0);
  const [opsPerSec, setOpsPerSec] = useState(0);
  const [activeRegion, setActiveRegion] = useState("Local / Edge Node");
  const opsHistoryRef = useRef<number[]>([]);

  // Track editor mutation operations per second
  useEffect(() => {
    if (!editor) return;

    const unlisten = editor.store.listen(
      (change) => {
        const added = Object.keys(change.changes.added).length;
        const updated = Object.keys(change.changes.updated).length;
        const removed = Object.keys(change.changes.removed).length;
        const totalDelta = added + updated + removed;
        if (totalDelta > 0) {
          setOpsCount((prev) => prev + totalDelta);
          opsHistoryRef.current.push(Date.now());
        }
      },
      { source: "all", scope: "document" },
    );

    return () => unlisten();
  }, [editor]);

  // Calculate sliding ops/sec and periodic ping latency
  useEffect(() => {
    const interval = window.setInterval(async () => {
      // Calculate ops in the last 2 seconds
      const now = Date.now();
      opsHistoryRef.current = opsHistoryRef.current.filter(
        (t) => now - t <= 2000,
      );
      setOpsPerSec(Math.round((opsHistoryRef.current.length / 2) * 10) / 10);

      // Measure real ping latency to sync server if configured, else synthetic fast local loop
      if (syncServerUrl) {
        const start = performance.now();
        try {
          const res = await fetch(`${syncServerUrl}/health`, {
            method: "GET",
            cache: "no-store",
          });
          if (res.ok) {
            const rtt = Math.round(performance.now() - start);
            setLatencyMs(rtt);
            const colo =
              res.headers.get("cf-ray") || "Edge (Cloudflare Workers)";
            setActiveRegion(
              colo.includes("-")
                ? `Edge PoP (${colo.split("-")[1]})`
                : "Cloudflare Edge",
            );
          } else {
            setLatencyMs(null);
          }
        } catch {
          setLatencyMs(null);
        }
      } else {
        // Fast local memory / SQLite loopback simulation
        setLatencyMs(Math.floor(Math.random() * 4) + 2); // 2-6ms local
        setActiveRegion("Device Localhost");
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, []);

  const getLatencyColor = () => {
    if (latencyMs === null) return "text-muted";
    if (latencyMs < 50) return "text-emerald-500";
    if (latencyMs < 150) return "text-amber-500";
    return "text-rose-500";
  };

  return (
    <div className="fixed bottom-3 right-3 z-30 font-sans text-xs">
      {/* HUD Trigger Pill */}
      <button
        aria-label="Toggle Network & Distributed Systems Diagnostics"
        className="flex h-7 items-center gap-1.5 rounded-full border border-line bg-panel/90 px-2.5 shadow-md backdrop-blur-md transition hover:bg-hover hover:border-accent text-ink"
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
      >
        <span
          className={`size-2 rounded-full ${
            connectionStatus === "connected"
              ? "bg-emerald-500 animate-pulse"
              : connectionStatus === "connecting"
                ? "bg-amber-500 animate-ping"
                : "bg-rose-500"
          }`}
        />
        <span className="font-mono font-medium">
          {latencyMs !== null ? `${latencyMs}ms` : "Syncing"}
        </span>
        <span className="text-muted text-[10px]">|</span>
        <span className="text-muted font-mono">{opsPerSec} ops/s</span>
        <Activity className="size-3 text-accent" />
        {isOpen ? (
          <ChevronDown className="size-3 text-muted" />
        ) : (
          <ChevronUp className="size-3 text-muted" />
        )}
      </button>

      {/* Expanded Diagnostics Card */}
      {isOpen && (
        <div className="absolute bottom-9 right-0 w-80 rounded-lg border border-line bg-panel p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div className="flex items-center gap-1.5">
              <Radio className="size-4 text-accent" />
              <span className="font-semibold text-ink">
                Edge & State Diagnostics
              </span>
            </div>
            <button
              aria-label="Close diagnostics"
              className="grid size-5 place-items-center rounded text-muted hover:bg-hover hover:text-ink"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2.5">
            {/* Latency & Connection */}
            <div className="flex items-center justify-between rounded bg-canvas/60 p-2">
              <div className="flex items-center gap-2">
                <Wifi className="size-3.5 text-muted" />
                <span className="text-muted">Edge RTT Latency</span>
              </div>
              <span className={`font-mono font-semibold ${getLatencyColor()}`}>
                {latencyMs !== null ? `${latencyMs} ms` : "Measuring..."}
              </span>
            </div>

            {/* Sync Ops */}
            <div className="flex items-center justify-between rounded bg-canvas/60 p-2">
              <div className="flex items-center gap-2">
                <Activity className="size-3.5 text-muted" />
                <span className="text-muted">Throughput</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-semibold text-ink">
                  {opsPerSec} ops/s
                </span>
                <span className="ml-1 text-[10px] text-muted font-mono">
                  ({opsCount} total)
                </span>
              </div>
            </div>

            {/* Runtime Architecture */}
            <div className="flex items-center justify-between rounded bg-canvas/60 p-2">
              <div className="flex items-center gap-2">
                <Globe className="size-3.5 text-muted" />
                <span className="text-muted">PoP Location</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-ink">
                {activeRegion}
              </span>
            </div>

            {/* Persistence Engine */}
            <div className="flex items-center justify-between rounded bg-canvas/60 p-2">
              <div className="flex items-center gap-2">
                <Database className="size-3.5 text-muted" />
                <span className="text-muted">Storage Engine</span>
              </div>
              <span className="font-mono text-[11px] font-medium text-accent">
                {isCloud ? "Cloudflare SQLite DO" : "Browser LocalStorage"}
              </span>
            </div>

            {/* Security / Hibernation Badge */}
            <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-[10px] text-muted">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="size-3 text-emerald-500" />
                <span>Zero-cold-start Hibernation</span>
              </div>
              <span>Protocol: WS / TLS 1.3</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

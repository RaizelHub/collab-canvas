import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, Timer } from "lucide-react";

interface MeetingTimerProps {
  onTimeUp?: () => void;
}

export function MeetingTimer({ onTimeUp }: MeetingTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [totalSeconds, setTotalSeconds] = useState(300); // Default 5 mins
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [hasFinished, setHasFinished] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Play synthesized web audio chime when timer hits zero
  const playChime = () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.6);
      });
    } catch {
      // Audio context may be restricted before user interaction
    }
  };

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      timerRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setHasFinished(true);
            playChime();
            onTimeUp?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, remainingSeconds, onTimeUp]);

  const toggleRunning = () => {
    if (hasFinished) {
      setRemainingSeconds(totalSeconds);
      setHasFinished(false);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setHasFinished(false);
  };

  const setPreset = (seconds: number) => {
    setIsRunning(false);
    setTotalSeconds(seconds);
    setRemainingSeconds(seconds);
    setHasFinished(false);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!isOpen) {
    return (
      <button
        aria-label="Open Meeting Timer"
        className="flex h-8 items-center gap-1.5 rounded border border-line bg-panel px-2.5 text-xs font-medium text-muted shadow-sm transition-colors hover:bg-hover hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Timer className="size-3.5 text-accent" />
        <span>Timer</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed left-1/2 top-14 z-40 -translate-x-1/2 rounded-xl border border-line bg-panel shadow-2xl transition-all ${
        hasFinished ? "animate-pulse border-danger ring-2 ring-danger" : ""
      }`}
    >
      {/* Timer Header */}
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <Timer className="size-3.5 text-accent" />
          <span>Room Timer</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            aria-label={isMinimized ? "Expand timer" : "Minimize timer"}
            className="grid size-5 place-items-center rounded text-muted hover:bg-hover hover:text-ink"
            onClick={() => setIsMinimized(!isMinimized)}
            type="button"
          >
            {isMinimized ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </button>
          <button
            aria-label="Close timer"
            className="grid size-5 place-items-center rounded text-muted hover:bg-hover hover:text-ink"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Main Timer Display */}
      <div className="p-3">
        <div className="text-center font-mono text-3xl font-bold tracking-wider text-ink">
          {formatTime(remainingSeconds)}
        </div>

        {!isMinimized && (
          <>
            {/* Presets */}
            <div className="mt-3 flex justify-center gap-1">
              {[
                { label: "1m", sec: 60 },
                { label: "3m", sec: 180 },
                { label: "5m", sec: 300 },
                { label: "10m", sec: 600 },
                { label: "15m", sec: 900 },
              ].map((p) => (
                <button
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    totalSeconds === p.sec
                      ? "bg-accent text-white"
                      : "border border-line bg-canvas text-muted hover:bg-hover hover:text-ink"
                  }`}
                  key={p.label}
                  onClick={() => setPreset(p.sec)}
                  type="button"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                className={`flex h-7 items-center gap-1 rounded px-3 text-xs font-medium text-white transition-opacity ${
                  isRunning ? "bg-amber-600 hover:bg-amber-700" : "bg-accent hover:opacity-90"
                }`}
                onClick={toggleRunning}
                type="button"
              >
                {isRunning ? (
                  <>
                    <Pause className="size-3" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="size-3" /> Start
                  </>
                )}
              </button>
              <button
                aria-label="Reset timer"
                className="grid size-7 place-items-center rounded border border-line bg-canvas text-muted hover:bg-hover hover:text-ink"
                onClick={handleReset}
                type="button"
              >
                <RotateCcw className="size-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { HardDrive } from "lucide-react";

export function LocalModeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 border border-line bg-canvas px-2 py-1 text-xs font-medium text-muted">
      <HardDrive aria-hidden="true" className="size-3.5" />
      Local mode
    </span>
  );
}

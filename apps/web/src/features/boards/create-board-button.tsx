import { Plus } from "lucide-react";

interface CreateBoardButtonProps {
  onCreate: () => void;
  compact?: boolean;
}

export function CreateBoardButton({
  onCreate,
  compact = false,
}: CreateBoardButtonProps) {
  return (
    <button
      className="flex h-9 shrink-0 items-center gap-2 bg-accent px-3 text-sm font-medium text-white transition hover:bg-accent-strong"
      onClick={onCreate}
      type="button"
    >
      <Plus aria-hidden="true" className="size-4" />
      <span className={compact ? "hidden xs:inline" : undefined}>
        Create board
      </span>
    </button>
  );
}

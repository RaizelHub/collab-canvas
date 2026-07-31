import { useRef } from "react";

import { AccessibleDialog } from "../../components/accessible-dialog";
import type { LocalBoard } from "./local-board";

interface DeleteBoardDialogProps {
  board: LocalBoard;
  cloud?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteBoardDialog({
  board,
  cloud = false,
  onCancel,
  onConfirm,
}: DeleteBoardDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const description = cloud
    ? "This permanently removes the board, its membership records, and its stored canvas data."
    : "This removes the board from this browser. Its local canvas data may also be removed when browser storage is cleared.";

  return (
    <AccessibleDialog
      description={description}
      initialFocusRef={cancelButtonRef}
      onClose={onCancel}
      panelClassName="max-w-sm"
      title={`Delete “${board.title}”?`}
    >
      <div className="mt-5 flex justify-end gap-2">
        <button
          className="h-9 border border-line bg-panel px-3 text-sm font-medium hover:bg-hover"
          onClick={onCancel}
          ref={cancelButtonRef}
          type="button"
        >
          Cancel
        </button>
        <button
          className="h-9 bg-danger px-3 text-sm font-medium text-white hover:bg-danger-strong"
          onClick={onConfirm}
          type="button"
        >
          Delete board
        </button>
      </div>
    </AccessibleDialog>
  );
}

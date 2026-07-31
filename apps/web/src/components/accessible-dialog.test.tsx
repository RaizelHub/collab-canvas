import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { AccessibleDialog } from "./accessible-dialog";

function DialogHarness({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">
        Open dialog
      </button>
      {open && (
        <AccessibleDialog
          description="Review this action before continuing."
          onClose={() => {
            onClose();
            setOpen(false);
          }}
          title="Confirm action"
        >
          <button type="button">Cancel</button>
          <button type="button">Continue</button>
        </AccessibleDialog>
      )}
    </>
  );
}

describe("AccessibleDialog", () => {
  it("provides a name and description, traps focus, and restores the trigger", async () => {
    const user = userEvent.setup();
    render(<DialogHarness onClose={() => undefined} />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog", {
      name: "Confirm action",
    });
    expect(dialog).toHaveAccessibleDescription(
      "Review this action before continuing.",
    );
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
  });

  it("invokes the close action on Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { describe, expect, it } from "vitest";

import { createLocalBoardRepository } from "../features/boards/local-board-repository";
import { DashboardPage } from "./dashboard-page";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

function BoardRouteProbe() {
  const { boardId } = useParams();
  return <p>Opened board {boardId}</p>;
}

describe("DashboardPage", () => {
  it("creates board metadata and navigates to its board route", async () => {
    const user = userEvent.setup();
    const storage = new MemoryStorage();
    const repository = createLocalBoardRepository({ storage });
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            element={<DashboardPage repository={repository} />}
            path="/dashboard"
          />
          <Route element={<BoardRouteProbe />} path="/board/:boardId" />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "No boards yet" }),
    ).toBeInTheDocument();

    const createButtons = screen.getAllByRole("button", {
      name: "Create board",
    });
    const emptyStateButton = createButtons.at(-1);
    if (!emptyStateButton) {
      throw new Error("Create board button was not found.");
    }
    await user.click(emptyStateButton);

    expect(await screen.findByText(/Opened board/)).toBeInTheDocument();
    const storedBoards = JSON.parse(
      storage.getItem("collab-canvas-local-boards") ?? "[]",
    ) as unknown[];
    expect(storedBoards).toHaveLength(1);
  });
});

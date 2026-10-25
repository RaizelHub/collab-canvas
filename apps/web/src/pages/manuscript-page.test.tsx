import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link } from "react-router";
import { describe, it, expect, vi } from "vitest";
import { ManuscriptPage } from "./manuscript-page";
const mocks = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn() }));
vi.mock("../features/auth/auth-context", () => ({
  useAuth: () => ({ user: { id: "user" } }),
}));
vi.mock("../features/pages/repository", () => ({ openDocument: mocks.open }));
vi.mock("../features/pages/writing-studio", () => ({
  WritingStudio: ({ documentId }: { documentId: string }) => (
    <div>Editing {documentId}</div>
  ),
}));
describe("manuscript route isolation", () => {
  it("removes the old editor while a different document is loading", async () => {
    mocks.open.mockImplementation((id: string) =>
      id === "first"
        ? Promise.resolve({
            doc: {},
            role: "owner",
            local: true,
            close: mocks.close,
          })
        : new Promise(() => {}),
    );
    render(
      <MemoryRouter initialEntries={["/pages/first"]}>
        <Link to="/pages/second">Switch document</Link>
        <Routes>
          <Route path="/pages/:documentId" element={<ManuscriptPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Editing first")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "Switch document" }));
    await waitFor(() =>
      expect(screen.queryByText("Editing first")).not.toBeInTheDocument(),
    );
    expect(mocks.close).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Opening manuscript");
  });
});

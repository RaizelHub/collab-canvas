import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  url: "https://sync.example.test",
  sync: vi.fn(),
  canvas: vi.fn(),
  getSession: vi.fn(),
  store: { status: "synced-remote", connectionStatus: "online", store: {} } as {
    status: string;
    connectionStatus?: string;
    store?: object;
  },
}));
vi.mock("../../lib/env", () => ({
  get syncServerUrl() {
    return mocks.url;
  },
}));
vi.mock("../../lib/supabase", () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));
vi.mock("../auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-a", email: "a@example.test", user_metadata: {} },
  }),
}));
vi.mock("@tldraw/sync", () => ({
  useSync: (options: unknown) => {
    mocks.sync(options);
    return mocks.store;
  },
}));
vi.mock("./workspace-controls", () => ({
  WorkspaceToolbar: () => null,
  WorkspaceNavigation: () => null,
  WorkspaceGrid: () => null,
}));
vi.mock("./phosphor-overrides", () => ({ phosphorOverrides: {} }));
vi.mock("tldraw", () => ({
  Tldraw: (props: { persistenceKey?: string; store?: unknown }) => {
    mocks.canvas(props);
    return (
      <div data-testid="canvas" data-mode={props.store ? "cloud" : "local"} />
    );
  },
  NoteShapeUtil: { configure: () => ({}) },
  DefaultFontStyle: {},
}));

import { WhiteboardCanvas } from "./whiteboard-canvas";

describe("whiteboard connection routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    mocks.url = "https://sync.example.test";
    mocks.store = {
      status: "synced-remote",
      connectionStatus: "online",
      store: {},
    };
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: "test-session" } },
      error: null,
    });
  });

  it("keeps explicit local boards local even when cloud services are configured", () => {
    render(
      <WhiteboardCanvas
        boardId="local-board"
        mode="local"
        persistenceKey="local-copy"
      />,
    );
    expect(screen.getByTestId("canvas")).toHaveAttribute("data-mode", "local");
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(mocks.canvas.mock.lastCall?.[0].persistenceKey).toBe("local-copy");
  });

  it("opens the cloud sync store without a browser persistence key", async () => {
    const onConnectionStatus = vi.fn();
    render(
      <WhiteboardCanvas
        boardId="shared-board"
        mode="cloud"
        onConnectionStatus={onConnectionStatus}
      />,
    );
    expect(screen.getByTestId("canvas")).toHaveAttribute("data-mode", "cloud");
    expect(mocks.canvas.mock.lastCall?.[0].persistenceKey).toBeUndefined();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ticket: "t".repeat(43),
          expiresAt: "2026-10-24T12:00:00.000Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const uri = await mocks.sync.mock.lastCall?.[0].uri();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sync.example.test/socket-ticket/shared-board",
      expect.objectContaining({
        method: "POST",
        headers: { Authorization: "Bearer test-session" },
      }),
    );
    expect(new URL(uri).pathname).toBe("/connect/shared-board");
    expect(new URL(uri).searchParams.get("ticket")).toBe("t".repeat(43));
    await waitFor(() =>
      expect(onConnectionStatus).toHaveBeenLastCalledWith("connected"),
    );
  });

  it("passes share-link authorization to the ticket request", async () => {
    render(
      <WhiteboardCanvas
        boardId="shared-board"
        mode="cloud"
        shareToken="shared-token"
      />,
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ticket: "t".repeat(43),
          expiresAt: "2026-10-24T12:00:00.000Z",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);
    await mocks.sync.mock.lastCall?.[0].uri();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          Authorization: "Bearer test-session",
          "X-Share-Token": "shared-token",
        },
      }),
    );
  });

  it("reports a disconnected socket as offline even after the store has loaded", () => {
    const onConnectionStatus = vi.fn();
    const { rerender } = render(
      <WhiteboardCanvas
        boardId="shared-board"
        mode="cloud"
        onConnectionStatus={onConnectionStatus}
      />,
    );
    mocks.store = { ...mocks.store, connectionStatus: "offline" };
    rerender(
      <WhiteboardCanvas
        boardId="shared-board"
        mode="cloud"
        onConnectionStatus={onConnectionStatus}
      />,
    );
    expect(onConnectionStatus).toHaveBeenLastCalledWith("offline");
  });

  it("blocks an unconfigured cloud board instead of silently editing a local copy", () => {
    mocks.url = "";
    const onConnectionStatus = vi.fn();
    render(
      <WhiteboardCanvas
        boardId="shared-board"
        mode="cloud"
        onConnectionStatus={onConnectionStatus}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Live collaboration is unavailable",
    );
    expect(mocks.canvas).not.toHaveBeenCalled();
    expect(mocks.sync).not.toHaveBeenCalled();
    expect(onConnectionStatus).toHaveBeenLastCalledWith("offline");
  });
});

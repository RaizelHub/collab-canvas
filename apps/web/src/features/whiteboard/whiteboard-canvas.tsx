import { workspaceShapeUtils } from "./shape-styles";
import { phosphorOverrides } from "./phosphor-overrides";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { atom } from "@tldraw/state";
import { useSync } from "@tldraw/sync";
import { socketTicketResponseSchema } from "@collab-canvas/shared";
import {
  createUserId,
  type TLAssetStore,
  type TLUserStore,
  UserRecordType,
} from "@tldraw/tlschema";
import { Tldraw, DefaultFontStyle, type Editor } from "tldraw";
import {
  WorkspaceToolbar,
  WorkspaceNavigation,
  WorkspaceGrid,
} from "./workspace-controls";
const workspaceComponents = {
  Grid: WorkspaceGrid,
  Toolbar: WorkspaceToolbar,
  NavigationPanel: WorkspaceNavigation,
};
import "tldraw/tldraw.css";
import "./workspace.css";

import { useAuth } from "../auth/auth-context";
import { syncServerUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";

interface WhiteboardCanvasBaseProps {
  boardId: string;
  onConnectionStatus?: (status: "connecting" | "connected" | "offline") => void;
  onMount?: (editor: Editor) => void;
}

type WhiteboardCanvasProps = WhiteboardCanvasBaseProps &
  (
    | { mode: "local"; persistenceKey: string; shareToken?: never }
    | { mode: "cloud"; persistenceKey?: never; shareToken?: string }
  );

interface CanvasErrorBoundaryProps {
  children: ReactNode;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
}

class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  public state: CanvasErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("tldraw canvas initialization failed.", error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="grid h-full place-items-center bg-panel p-6 text-center">
          <div className="max-w-md">
            <h2 className="text-base font-semibold">Canvas could not load</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Refresh the page. If this continues, check browser storage access
              and confirm that tldraw styles are loading.
            </p>
            <button
              className="mt-5 h-9 bg-accent px-3 text-sm font-medium text-white"
              onClick={() => window.location.reload()}
              type="button"
            >
              Refresh canvas
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function WhiteboardCanvas({
  boardId,
  mode,
  onConnectionStatus,
  onMount,
  persistenceKey,
  shareToken,
}: WhiteboardCanvasProps) {
  if (mode === "local") {
    return (
      <LocalWhiteboardCanvas
        onMount={onMount}
        persistenceKey={persistenceKey}
      />
    );
  }

  if (!syncServerUrl || !supabase) {
    return <UnavailableCloudCanvas onConnectionStatus={onConnectionStatus} />;
  }

  return (
    <CollaborativeWhiteboardCanvas
      boardId={boardId}
      onConnectionStatus={onConnectionStatus}
      onMount={onMount}
      shareToken={shareToken}
    />
  );
}

function UnavailableCloudCanvas({
  onConnectionStatus,
}: Pick<WhiteboardCanvasBaseProps, "onConnectionStatus">) {
  useEffect(() => {
    onConnectionStatus?.("offline");
  }, [onConnectionStatus]);
  return (
    <div
      className="grid h-full place-items-center bg-panel p-6 text-center"
      role="alert"
    >
      <div className="max-w-md">
        <h2 className="font-semibold">Live collaboration is unavailable</h2>
        <p className="mt-2 text-sm text-muted">
          The collaboration service is not configured. This shared board cannot
          connect. Your existing browser-local drawings have not been deleted.
        </p>
      </div>
    </div>
  );
}

function LocalWhiteboardCanvas({
  persistenceKey,
  onMount,
}: {
  onMount?: (editor: Editor) => void;
  persistenceKey: string;
}) {
  return (
    <CanvasErrorBoundary>
      <Tldraw
        overrides={phosphorOverrides}
        components={workspaceComponents}
        shapeUtils={workspaceShapeUtils}
        onMount={(editor) => {
          editor.updateInstanceState({ isGridMode: true });
          editor.setStyleForNextShapes(DefaultFontStyle, "sans");
          onMount?.(editor);
        }}
        persistenceKey={persistenceKey}
      />
    </CanvasErrorBoundary>
  );
}

function CollaborativeWhiteboardCanvas({
  boardId,
  onConnectionStatus,
  onMount,
  shareToken,
}: {
  boardId: string;
  onConnectionStatus?: WhiteboardCanvasProps["onConnectionStatus"];
  onMount?: (editor: Editor) => void;
  shareToken?: string;
}) {
  const { user } = useAuth();
  const serverUrl = syncServerUrl as string;

  const assets = useMemo<TLAssetStore>(() => {
    const resolvedUrls = new Map<string, Promise<string | null>>();
    const uploadedAssets = new Map<string, string>();

    const getAccessToken = async () => {
      const { data, error } = await supabase!.auth.getSession();
      if (error || !data.session?.access_token) {
        throw new Error("Your session has expired. Sign in again.");
      }
      return data.session.access_token;
    };

    return {
      upload: async (asset, file, abortSignal) => {
        const assetId = crypto.randomUUID();
        const token = await getAccessToken();
        const response = await fetch(
          `${serverUrl}/assets/${boardId}/${assetId}`,
          {
            method: "PUT",
            body: file,
            signal: abortSignal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": file.type,
              "X-Asset-Filename": file.name,
              ...(shareToken ? { "X-Share-Token": shareToken } : {}),
            },
          },
        );
        const result = (await response.json()) as {
          error?: string;
          src?: string;
        };
        if (!response.ok || !result.src) {
          throw new Error(result.error ?? "Asset upload failed.");
        }
        uploadedAssets.set(asset.id, result.src);
        return { src: result.src };
      },
      resolve: (asset) => {
        const source = asset.props.src;
        if (!source?.startsWith("/assets/")) return source ?? null;
        const existing = resolvedUrls.get(source);
        if (existing) return existing;

        const resolution = getAccessToken()
          .then((token) =>
            fetch(`${serverUrl}${source}/sign`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                ...(shareToken ? { "X-Share-Token": shareToken } : {}),
              },
            }),
          )
          .then(async (response) => {
            if (!response.ok) return null;
            const body = (await response.json()) as { url?: string };
            return body.url ?? null;
          })
          .catch((error: unknown) => {
            console.error("Asset URL resolution failed.", error);
            return null;
          });
        resolvedUrls.set(source, resolution);
        return resolution;
      },
      remove: async (assetIds) => {
        const token = await getAccessToken();
        await Promise.all(
          assetIds.map(async (assetId) => {
            const source = uploadedAssets.get(assetId);
            if (!source) return;
            const response = await fetch(`${serverUrl}${source}`, {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                ...(shareToken ? { "X-Share-Token": shareToken } : {}),
              },
            });
            if (!response.ok) {
              throw new Error("Asset cleanup failed.");
            }
            uploadedAssets.delete(assetId);
            resolvedUrls.delete(source);
          }),
        );
      },
    };
  }, [boardId, serverUrl, shareToken]);

  const users = useMemo<TLUserStore>(() => {
    const displayName =
      user?.user_metadata.display_name?.toString() ??
      user?.email?.split("@")[0] ??
      "Collaborator";
    return {
      currentUser: atom(
        `collab-canvas-user-${user?.id ?? "anonymous"}`,
        user
          ? UserRecordType.create({
              id: createUserId(user.id),
              name: displayName,
              color: "#2563eb",
              imageUrl: user.user_metadata.avatar_url?.toString() ?? "",
              meta: {},
            })
          : null,
      ),
    };
  }, [user]);

  const getSyncUri = useCallback(async () => {
    const { data, error } = await supabase!.auth.getSession();
    if (error || !data.session?.access_token) {
      throw new Error("Your session has expired. Sign in again.");
    }
    const ticketResponse = await fetch(
      `${serverUrl}/socket-ticket/${boardId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          ...(shareToken ? { "X-Share-Token": shareToken } : {}),
        },
      },
    );
    const ticket = socketTicketResponseSchema.safeParse(
      await ticketResponse.json().catch(() => null),
    );
    if (!ticketResponse.ok || !ticket.success) {
      throw new Error("The collaboration session could not be started.");
    }
    const url = new URL(`${serverUrl}/connect/${boardId}`);
    url.searchParams.set("ticket", ticket.data.ticket);
    return url.toString();
  }, [boardId, serverUrl, shareToken]);

  const store = useSync({
    assets,
    users,
    uri: getSyncUri,
  });

  const connectionStatus =
    store.status === "synced-remote"
      ? store.connectionStatus === "online"
        ? "connected"
        : "offline"
      : store.status === "error"
        ? "offline"
        : "connecting";
  useEffect(() => {
    onConnectionStatus?.(connectionStatus);
  }, [onConnectionStatus, connectionStatus]);

  return (
    <CanvasErrorBoundary>
      <Tldraw
        overrides={phosphorOverrides}
        components={workspaceComponents}
        shapeUtils={workspaceShapeUtils}
        onMount={(editor) => {
          editor.updateInstanceState({ isGridMode: true });
          editor.setStyleForNextShapes(DefaultFontStyle, "sans");
          onMount?.(editor);
        }}
        store={store}
      />
    </CanvasErrorBoundary>
  );
}

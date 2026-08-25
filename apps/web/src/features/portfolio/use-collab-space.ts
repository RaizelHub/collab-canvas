import {
  collabObjectSchema,
  presencePlayerSchema,
  socketTicketResponseSchema,
  type CollabObject,
  type PresencePlayer,
  type VisitorSession,
} from "@collab-canvas/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import { syncServerUrl } from "../../lib/env";
import { getLocalVisitorSession, loadVisitorSession } from "./visitor-session";

const localObjectsKey = "collab-canvas:portfolio-local-objects";
type ConnectionStatus = "connecting" | "connected" | "offline" | "local";

interface ObjectDraft {
  type: CollabObject["type"];
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points: CollabObject["points"];
  color: string;
}

function readLocalObjects(): CollabObject[] {
  const raw = window.localStorage.getItem(localObjectsKey);
  if (!raw) return [];
  try {
    const values: unknown = JSON.parse(raw);
    return Array.isArray(values)
      ? values.flatMap((value) => {
          const parsed = collabObjectSchema.safeParse(value);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
  } catch {
    return [];
  }
}

function wsUrl(serverUrl: string, token: string): string {
  const url = new URL(`${serverUrl}/portfolio/connect`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("token", token);
  return url.toString();
}

export function useCollabSpace() {
  const [session, setSession] = useState<VisitorSession | null>(null);
  const [objects, setObjects] = useState<CollabObject[]>([]);
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [message, setMessage] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<number | null>(null);
  const sessionRef = useRef<VisitorSession | null>(null);

  useEffect(() => {
    let active = true;
    loadVisitorSession()
      .catch(() => getLocalVisitorSession())
      .then((value) => {
        if (active) {
          sessionRef.current = value;
          setSession(value);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    if (!syncServerUrl || session.token.startsWith("local_")) {
      const timer = window.setTimeout(() => {
        setObjects(readLocalObjects());
        setPlayers([
          {
            visitorId: session.visitor.id,
            name: session.visitor.name,
            avatarUrl: session.visitor.avatarUrl,
            color: session.visitor.color,
            x: 1000,
            y: 1050,
            direction: "up",
            moving: false,
            sequence: 0,
          },
        ]);
        setStatus("local");
      }, 0);
      return () => window.clearTimeout(timer);
    }

    let disposed = false;
    let retry = 0;
    const serverUrl = syncServerUrl;
    const connect = async () => {
      if (disposed) return;
      setStatus("connecting");
      let socketTicket: string;
      try {
        const response = await fetch(`${serverUrl}/portfolio/socket-ticket`, {
          method: "POST",
          headers: { "X-Visitor-Token": session.token },
        });
        const parsed = socketTicketResponseSchema.safeParse(
          await response.json().catch(() => null),
        );
        if (!response.ok || !parsed.success) throw new Error("ticket_failed");
        socketTicket = parsed.data.ticket;
      } catch {
        if (disposed) return;
        setStatus("offline");
        retry += 1;
        reconnectRef.current = window.setTimeout(
          () => void connect(),
          Math.min(1000 * 2 ** retry, 10_000),
        );
        return;
      }
      if (disposed) return;
      const socket = new WebSocket(wsUrl(serverUrl, socketTicket));
      socketRef.current = socket;
      socket.onopen = () => {
        retry = 0;
        setStatus("connected");
      };
      socket.onmessage = (event) => {
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data as string) as Record<string, unknown>;
        } catch {
          return;
        }
        if (payload.type === "space.init") {
          const nextObjects = Array.isArray(payload.objects)
            ? payload.objects.flatMap((value) => {
                const parsed = collabObjectSchema.safeParse(value);
                return parsed.success ? [parsed.data] : [];
              })
            : [];
          const nextPlayers = Array.isArray(payload.players)
            ? payload.players.flatMap((value) => {
                const parsed = presencePlayerSchema.safeParse(value);
                return parsed.success ? [parsed.data] : [];
              })
            : [];
          setObjects(nextObjects);
          setPlayers(nextPlayers);
          return;
        }
        if (
          payload.type === "player.join" ||
          payload.type === "player.update"
        ) {
          const parsed = presencePlayerSchema.safeParse(payload.player);
          if (!parsed.success) return;
          setPlayers((current) => [
            ...current.filter(
              (player) => player.visitorId !== parsed.data.visitorId,
            ),
            parsed.data,
          ]);
          return;
        }
        if (
          payload.type === "player.leave" &&
          typeof payload.visitorId === "string"
        ) {
          setPlayers((current) =>
            current.filter((player) => player.visitorId !== payload.visitorId),
          );
          return;
        }
        if (payload.type === "object.created") {
          const parsed = collabObjectSchema.safeParse(payload.object);
          if (!parsed.success) return;
          setObjects((current) => [
            ...current.filter(
              (object) =>
                object.id !== payload.tempId && object.id !== parsed.data.id,
            ),
            parsed.data,
          ]);
          return;
        }
        if (payload.type === "object.updated") {
          const parsed = collabObjectSchema.safeParse(payload.object);
          if (parsed.success)
            setObjects((current) =>
              current.map((object) =>
                object.id === parsed.data.id ? parsed.data : object,
              ),
            );
          return;
        }
        if (
          payload.type === "object.deleted" &&
          typeof payload.id === "string"
        ) {
          setObjects((current) =>
            current.filter((object) => object.id !== payload.id),
          );
          return;
        }
        if (payload.type === "operation.rejected") {
          if (typeof payload.tempId === "string")
            setObjects((current) =>
              current.filter((object) => object.id !== payload.tempId),
            );
          setMessage(
            typeof payload.reason === "string"
              ? payload.reason
              : "That change could not be saved.",
          );
        }
      };
      socket.onclose = (event) => {
        if (disposed) return;
        setStatus("offline");
        if (event.code === 4001) {
          setMessage("This visitor identity is active in a newer tab.");
          return;
        }
        retry += 1;
        reconnectRef.current = window.setTimeout(
          () => void connect(),
          Math.min(1000 * 2 ** retry, 10_000),
        );
      };
      socket.onerror = () => socket.close();
    };
    void connect();
    return () => {
      disposed = true;
      if (reconnectRef.current !== null)
        window.clearTimeout(reconnectRef.current);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [session]);

  const persistLocal = useCallback((next: CollabObject[]) => {
    window.localStorage.setItem(localObjectsKey, JSON.stringify(next));
  }, []);

  const createObject = useCallback(
    (draft: ObjectDraft) => {
      const identity = sessionRef.current;
      if (!identity) return;
      const tempId = `temp_${crypto.randomUUID()}`;
      const timestamp = new Date().toISOString();
      const object = collabObjectSchema.parse({
        ...draft,
        id: tempId,
        visitorId: identity.visitor.id,
        visitorName: identity.visitor.name,
        avatarUrl: identity.visitor.avatarUrl,
        createdAt: timestamp,
        updatedAt: timestamp,
        hidden: false,
      });
      setObjects((current) => {
        const next = [...current, object];
        if (!syncServerUrl || identity.token.startsWith("local_"))
          persistLocal(next);
        return next;
      });
      socketRef.current?.send(
        JSON.stringify({ type: "object.create", tempId, object: draft }),
      );
    },
    [persistLocal],
  );

  const updateObject = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<CollabObject, "content" | "x" | "y" | "width" | "height">
      >,
    ) => {
      const identity = sessionRef.current;
      if (!identity) return;
      setObjects((current) => {
        const next = current.map((object) =>
          object.id === id && object.visitorId === identity.visitor.id
            ? { ...object, ...patch, updatedAt: new Date().toISOString() }
            : object,
        );
        if (!syncServerUrl || identity.token.startsWith("local_"))
          persistLocal(next);
        return next;
      });
      socketRef.current?.send(
        JSON.stringify({ type: "object.update", id, patch }),
      );
    },
    [persistLocal],
  );

  const deleteObject = useCallback(
    (id: string) => {
      const identity = sessionRef.current;
      if (!identity) return;
      setObjects((current) => {
        const next = current.filter(
          (object) =>
            object.id !== id ||
            (object.visitorId !== identity.visitor.id &&
              !identity.visitor.isAdmin),
        );
        if (!syncServerUrl || identity.token.startsWith("local_"))
          persistLocal(next);
        return next;
      });
      socketRef.current?.send(JSON.stringify({ type: "object.delete", id }));
    },
    [persistLocal],
  );

  const sendMove = useCallback((player: PresencePlayer) => {
    setPlayers((current) => [
      ...current.filter((value) => value.visitorId !== player.visitorId),
      player,
    ]);
    socketRef.current?.send(
      JSON.stringify({
        type: "player.move",
        x: player.x,
        y: player.y,
        direction: player.direction,
        moving: player.moving,
        sequence: player.sequence,
      }),
    );
  }, []);

  return {
    session,
    objects: objects.filter(
      (object) => !object.hidden || session?.visitor.isAdmin,
    ),
    players,
    status,
    message,
    clearMessage: () => setMessage(""),
    createObject,
    updateObject,
    deleteObject,
    sendMove,
  };
}

import {
  visitorSessionSchema,
  type VisitorSession,
} from "@collab-canvas/shared";

import { supabase } from "../../lib/supabase";
import { syncServerUrl } from "../../lib/env";

const tokenKey = "collab-canvas:portfolio-visitor-token";
const localSessionKey = "collab-canvas:portfolio-local-session";
const colors = ["#b86b4b", "#54786b", "#77704d", "#6f6a8f", "#8a5f67"];
const adjectives = [
  "Quiet",
  "Small",
  "Warm",
  "Kind",
  "Clear",
  "Brisk",
  "Soft",
  "Calm",
];
const animals = [
  "Fox",
  "Otter",
  "Finch",
  "Moth",
  "Lynx",
  "Wren",
  "Hare",
  "Panda",
];

function localSession(): VisitorSession {
  const saved = window.localStorage.getItem(localSessionKey);
  if (saved) {
    try {
      const parsed = visitorSessionSchema.safeParse(JSON.parse(saved));
      if (parsed.success) return parsed.data;
    } catch {
      window.localStorage.removeItem(localSessionKey);
    }
  }
  const id = `visitor_${crypto.randomUUID()}`;
  const hash = [...id].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) >>> 0,
    7,
  );
  const session: VisitorSession = {
    token: `local_${crypto.randomUUID()}_${crypto.randomUUID()}`,
    visitor: {
      id,
      name: `${adjectives[hash % adjectives.length]}${animals[Math.floor(hash / 7) % animals.length]}${10 + (hash % 90)}`,
      avatarUrl: null,
      color: colors[hash % colors.length] ?? "#54786b",
      isAdmin: false,
    },
  };
  window.localStorage.setItem(localSessionKey, JSON.stringify(session));
  return session;
}

export async function loadVisitorSession(): Promise<VisitorSession> {
  if (!syncServerUrl) return localSession();
  const auth = supabase ? await supabase.auth.getSession() : null;
  const accessToken = auth?.data.session?.access_token;
  const savedToken = window.localStorage.getItem(tokenKey);
  const response = await fetch(`${syncServerUrl}/portfolio/session`, {
    method: "POST",
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(savedToken ? { "X-Visitor-Token": savedToken } : {}),
    },
  });
  const parsed = visitorSessionSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!response.ok || !parsed.success)
    throw new Error("Visitor identity is temporarily unavailable.");
  window.localStorage.setItem(tokenKey, parsed.data.token);
  return parsed.data;
}

export function getLocalVisitorSession(): VisitorSession {
  return localSession();
}

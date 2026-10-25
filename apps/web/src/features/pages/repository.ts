import * as Y from "yjs";
import { IndexeddbPersistence, storeState } from "y-indexeddb";
import { supabase } from "../../lib/supabase";
import { canWrite, type DocumentRole, type Manuscript } from "./model";
import { createManuscript, decodeUpdate, encodeUpdate } from "./document-state";
import { validateRecovery } from "./recovery-validation";

export type DocumentSummary = Pick<
  Manuscript,
  "id" | "title" | "template" | "created_at"
> & { local?: boolean };
const indexKey = (userId: string) => `collabcanvas:pages:${userId}`;
export function localDocuments(userId: string): DocumentSummary[] {
  try {
    return JSON.parse(localStorage.getItem(indexKey(userId)) ?? "[]");
  } catch {
    return [];
  }
}
export async function listDocuments(userId: string) {
  const local = localDocuments(userId);
  if (!supabase)
    return { documents: local, error: "Cloud storage is not configured." };
  const { data, error } = await supabase
    .from("manuscripts")
    .select("id,title,template,created_at")
    .order("created_at", { ascending: false });
  return {
    documents: [...local, ...(data ?? [])] as DocumentSummary[],
    error: error
      ? "Cloud Pages is unavailable. Apply the Pages database migration to enable cloud documents. Browser drafts remain available."
      : null,
  };
}
export async function createDocument(
  userId: string,
  title: string,
  template: string,
  local: boolean,
) {
  const doc = createManuscript(template, title);
  const id = `${local ? "local-" : ""}${crypto.randomUUID()}`;
  const initial_state = encodeUpdate(Y.encodeStateAsUpdate(doc));
  try {
    if (local) {
      const persistence = new IndexeddbPersistence(
        `pages:${userId}:${id}`,
        doc,
      );
      await persistence.whenSynced;
      await storeState(persistence, true);
      await persistence.destroy();
      localStorage.setItem(
        indexKey(userId),
        JSON.stringify([
          {
            id,
            title,
            template,
            created_at: new Date().toISOString(),
            local: true,
          },
          ...localDocuments(userId),
        ]),
      );
    } else {
      if (!supabase) throw new Error("Cloud storage is not configured.");
      const { error } = await supabase
        .from("manuscripts")
        .insert({ id, title, template, owner_id: userId, initial_state });
      if (error)
        throw new Error(`Could not create cloud document: ${error.message}`);
    }
    return id;
  } finally {
    doc.destroy();
  }
}
export interface DocumentSession {
  doc: Y.Doc;
  role: DocumentRole;
  local: boolean;
  close: () => Promise<void>;
  flush: () => Promise<void>;
}
export async function openDocument(
  id: string,
  userId: string,
  onStatus: (status: string) => void,
): Promise<DocumentSession> {
  const local = id.startsWith("local-");
  const doc = new Y.Doc();
  let role: DocumentRole = "owner";
  if (local) {
    if (!localDocuments(userId).some((d) => d.id === id))
      throw new Error("This browser draft was not found for your account.");
  } else {
    if (!supabase) throw new Error("Cloud storage is not configured.");
    const { data, error } = await supabase
      .from("manuscripts")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data)
      throw new Error(
        "Document unavailable. Check your access and the Pages database migration.",
      );
    if (data.owner_id !== userId) {
      const { data: member, error: memberError } = await supabase
        .from("manuscript_members")
        .select("role")
        .eq("document_id", id)
        .eq("user_id", userId)
        .single();
      if (memberError || !member)
        throw new Error("You no longer have access to this document.");
      role = member.role;
    }
    Y.applyUpdate(doc, decodeUpdate(data.initial_state), "remote");
  }
  const persistence = canWrite(role)
    ? new IndexeddbPersistence(`pages:${userId}:${id}`, doc)
    : null;
  if (persistence) await persistence.whenSynced;
  let closed = false,
    dirty = canWrite(role),
    saving = false,
    polling = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  const seen = new Set<string>();
  let pending: Uint8Array[] = [];
  let savedTitle = String(
    doc.getMap("meta").get("title") ?? "Untitled manuscript",
  );
  async function pull() {
    if (local || closed || polling || !supabase) return;
    polling = true;
    try {
      // Reconcile the append-only log, including updates missed while disconnected.
      for (let offset = 0; !closed; offset += 500) {
        const { data, error } = await supabase
          .from("manuscript_updates")
          .select("id")
          .eq("document_id", id)
          .order("sequence")
          .range(offset, offset + 499);
        if (error) throw error;
        const missing = (data ?? []).filter((row) => !seen.has(row.id));
        for (let start = 0; start < missing.length; start += 100) {
          const result = await supabase
            .from("manuscript_updates")
            .select("id,update")
            .eq("document_id", id)
            .in(
              "id",
              missing.slice(start, start + 100).map((row) => row.id),
            );
          if (result.error) throw result.error;
          for (const row of result.data ?? []) {
            Y.applyUpdate(doc, decodeUpdate(row.update), "remote");
            seen.add(row.id);
          }
        }
        if (!data || data.length < 500) break;
      }
    } catch {
      onStatus("Offline · changes pending; retrying");
    } finally {
      polling = false;
    }
  }
  async function flush() {
    if (saving || !dirty || !canWrite(role)) return;
    saving = true;
    dirty = false;
    const batch = pending;
    pending = [];
    try {
      if (persistence) await storeState(persistence, true);
      if (!local) {
        if (!supabase) throw new Error("Cloud unavailable");
        const updateId = crypto.randomUUID();
        const { error } = await supabase.from("manuscript_updates").insert({
          id: updateId,
          document_id: id,
          author_id: userId,
          update: encodeUpdate(
            batch.length ? Y.mergeUpdates(batch) : Y.encodeStateAsUpdate(doc),
          ),
        });
        if (error) throw error;
        seen.add(updateId);
        const title =
          String(doc.getMap("meta").get("title") ?? "")
            .trim()
            .slice(0, 120) || "Untitled manuscript";
        if (title !== savedTitle) {
          const renamed = await supabase
            .from("manuscripts")
            .update({ title })
            .eq("id", id);
          if (renamed.error) throw renamed.error;
          savedTitle = title;
        }
      } else {
        localStorage.setItem(
          indexKey(userId),
          JSON.stringify(
            localDocuments(userId).map((item) =>
              item.id === id
                ? {
                    ...item,
                    title: String(
                      doc.getMap("meta").get("title") ?? item.title,
                    ),
                  }
                : item,
            ),
          ),
        );
      }
      onStatus(
        dirty ? "Saving…" : local ? "Saved in this browser" : "Saved to cloud",
      );
    } catch {
      pending = [...batch, ...pending];
      dirty = true;
      onStatus("Save failed · download a recovery copy; retrying");
    } finally {
      saving = false;
    }
  }
  await pull();
  const changed = (update: Uint8Array, origin: unknown) => {
    if (origin === "remote" || !canWrite(role)) return;
    dirty = true;
    pending.push(update);
    onStatus("Saving…");
    clearTimeout(timer);
    timer = setTimeout(() => void flush(), 800);
  };
  doc.on("update", changed);
  await flush();
  if (!canWrite(role))
    onStatus(
      `${role === "viewer" ? "View" : "Comment"} access · polling every 3 seconds`,
    );
  const interval = setInterval(() => {
    void pull();
    void flush();
  }, 3000);
  const unload = (e: BeforeUnloadEvent) => {
    if (dirty || saving) {
      e.preventDefault();
      e.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", unload);
  return {
    doc,
    role,
    local,
    flush,
    close: async () => {
      closed = true;
      clearInterval(interval);
      clearTimeout(timer);
      window.removeEventListener("beforeunload", unload);
      doc.off("update", changed);
      // Do not destroy IndexedDB or the CRDT while an in-flight save is using it.
      while (saving || polling)
        await new Promise((resolve) => setTimeout(resolve, 20));
      await flush();
      if (persistence) await persistence.destroy();
      doc.destroy();
    },
  };
}

/** Recovery opens a new browser draft, never overwrites an existing document. */
export async function importRecovery(
  userId: string,
  file: File,
): Promise<string> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Recovery files are limited to 20 MB.");
  const data: unknown = JSON.parse(await file.text());
  if (
    !data ||
    typeof data !== "object" ||
    !("version" in data) ||
    data.version !== 1 ||
    !("update" in data) ||
    typeof data.update !== "string"
  )
    throw new Error("This is not a CollabCanvas Pages recovery file.");
  const doc = new Y.Doc();
  try {
    Y.applyUpdate(doc, decodeUpdate(data.update));
    validateRecovery(doc);
    if (!doc.getXmlFragment("content").length)
      throw new Error("Recovery file has no manuscript content.");
    const title = String(
      doc.getMap("meta").get("title") ?? "Recovered manuscript",
    ).slice(0, 120);
    const id = `local-${crypto.randomUUID()}`;
    const persistence = new IndexeddbPersistence(`pages:${userId}:${id}`, doc);
    await persistence.whenSynced;
    await storeState(persistence, true);
    await persistence.destroy();
    localStorage.setItem(
      indexKey(userId),
      JSON.stringify([
        {
          id,
          title,
          template: "recovered",
          created_at: new Date().toISOString(),
          local: true,
        },
        ...localDocuments(userId),
      ]),
    );
    return id;
  } finally {
    doc.destroy();
  }
}

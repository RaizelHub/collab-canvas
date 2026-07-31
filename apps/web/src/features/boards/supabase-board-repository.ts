import type { SupabaseClient } from "@supabase/supabase-js";
import { boardRoleSchema, boardVisibilitySchema } from "@collab-canvas/shared";
import { z } from "zod";

import { supabaseTimestampSchema } from "../../lib/supabase-timestamp";
import type { LocalBoard } from "./local-board";

const boardRowSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  created_at: supabaseTimestampSchema,
  updated_at: supabaseTimestampSchema,
  last_activity_at: supabaseTimestampSchema,
  owner_id: z.uuid(),
  visibility: boardVisibilitySchema,
});

export interface CloudBoard extends LocalBoard {
  canManage: boolean;
  ownerName: string;
  ownerId: string;
  role: "owner" | "editor" | "viewer";
  visibility: z.infer<typeof boardRowSchema>["visibility"];
}

export class BoardRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BoardRepositoryError";
  }
}

function mapBoardRow(
  value: unknown,
  userId: string,
  membershipRole?: unknown,
  lastOpenedAt?: unknown,
  ownerName?: unknown,
): CloudBoard {
  const parsed = boardRowSchema.safeParse(value);
  if (!parsed.success) {
    console.error("Supabase returned malformed board data.", parsed.error);
    throw new BoardRepositoryError("The board service returned invalid data.");
  }

  return {
    id: parsed.data.id,
    title: parsed.data.title,
    createdAt: parsed.data.created_at,
    updatedAt: parsed.data.updated_at,
    lastOpenedAt:
      supabaseTimestampSchema.safeParse(lastOpenedAt).data ??
      parsed.data.last_activity_at,
    canManage: parsed.data.owner_id === userId,
    ownerId: parsed.data.owner_id,
    ownerName:
      typeof ownerName === "string" && ownerName.trim()
        ? ownerName
        : parsed.data.owner_id === userId
          ? "You"
          : "Board owner",
    role:
      parsed.data.owner_id === userId
        ? "owner"
        : (boardRoleSchema.safeParse(membershipRole).data ?? "viewer"),
    visibility: parsed.data.visibility,
  };
}

function requestError(message: string, error: unknown): BoardRepositoryError {
  console.error(message, error);
  return new BoardRepositoryError(message);
}

export function createSupabaseBoardRepository(
  client: SupabaseClient,
  userId: string,
) {
  return {
    async list(): Promise<CloudBoard[]> {
      const [boardsResult, membershipsResult, recentResult] = await Promise.all(
        [
          client
            .from("boards")
            .select(
              "id,title,created_at,updated_at,last_activity_at,owner_id,visibility",
            )
            .order("last_activity_at", { ascending: false }),
          client
            .from("board_members")
            .select("board_id,role")
            .eq("user_id", userId),
          client
            .from("board_recent_access")
            .select("board_id,last_opened_at")
            .eq("user_id", userId),
        ],
      );
      if (boardsResult.error || membershipsResult.error || recentResult.error) {
        throw requestError(
          "Boards could not be loaded.",
          boardsResult.error ?? membershipsResult.error ?? recentResult.error,
        );
      }
      const roles = new Map(
        (membershipsResult.data ?? []).map((membership) => [
          membership.board_id,
          membership.role,
        ]),
      );
      const recent = new Map(
        (recentResult.data ?? []).map((entry) => [
          entry.board_id,
          entry.last_opened_at,
        ]),
      );
      const ownerIds = [
        ...new Set((boardsResult.data ?? []).map((board) => board.owner_id)),
      ];
      const profilesResult =
        ownerIds.length > 0
          ? await client
              .from("profiles")
              .select("id,display_name")
              .in("id", ownerIds)
          : { data: [], error: null };
      if (profilesResult.error) {
        throw requestError(
          "Board owners could not be loaded.",
          profilesResult.error,
        );
      }
      const ownerNames = new Map(
        (profilesResult.data ?? []).map((profile) => [
          profile.id,
          profile.display_name,
        ]),
      );
      return (boardsResult.data ?? []).map((row) =>
        mapBoardRow(
          row,
          userId,
          roles.get(row.id),
          recent.get(row.id),
          ownerNames.get(row.owner_id),
        ),
      );
    },

    async getById(id: string): Promise<CloudBoard | null> {
      const { data, error } = await client
        .from("boards")
        .select(
          "id,title,created_at,updated_at,last_activity_at,owner_id,visibility",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) {
        throw requestError("The board could not be loaded.", error);
      }
      if (!data) return null;
      const { data: membership, error: membershipError } = await client
        .from("board_members")
        .select("role")
        .eq("board_id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (membershipError) {
        throw requestError(
          "Board permissions could not be loaded.",
          membershipError,
        );
      }
      const { data: owner } = await client
        .from("profiles")
        .select("display_name")
        .eq("id", data.owner_id)
        .maybeSingle();
      return mapBoardRow(
        data,
        userId,
        membership?.role,
        undefined,
        owner?.display_name,
      );
    },

    async create(): Promise<CloudBoard> {
      const { data, error } = await client
        .rpc("create_board", { board_title: "Untitled board" })
        .select(
          "id,title,created_at,updated_at,last_activity_at,owner_id,visibility",
        )
        .single();
      if (error) {
        throw requestError("The board could not be created.", error);
      }
      return mapBoardRow(data, userId);
    },

    async rename(id: string, title: string): Promise<CloudBoard> {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw new BoardRepositoryError("Board title cannot be empty.");
      }
      const { data, error } = await client
        .from("boards")
        .update({ title: trimmedTitle.slice(0, 120) })
        .eq("id", id)
        .select(
          "id,title,created_at,updated_at,last_activity_at,owner_id,visibility",
        )
        .single();
      if (error) {
        throw requestError("The board could not be renamed.", error);
      }
      return mapBoardRow(data, userId);
    },

    async remove(id: string): Promise<void> {
      const { error } = await client.from("boards").delete().eq("id", id);
      if (error) {
        throw requestError("The board could not be deleted.", error);
      }
    },

    async markOpened(id: string): Promise<void> {
      const { error } = await client.from("board_recent_access").upsert(
        {
          board_id: id,
          user_id: userId,
          last_opened_at: new Date().toISOString(),
        },
        { onConflict: "board_id,user_id" },
      );
      if (error) {
        throw requestError("Recent board activity could not be saved.", error);
      }
    },
  };
}

export type SupabaseBoardRepository = ReturnType<
  typeof createSupabaseBoardRepository
>;

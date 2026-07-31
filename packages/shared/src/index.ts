import { z } from "zod";

export const PRODUCT_NAME = "CollabCanvas";

export const BOARD_ROLES = ["owner", "editor", "viewer"] as const;
export const boardRoleSchema = z.enum(BOARD_ROLES);
export type BoardRole = z.infer<typeof boardRoleSchema>;

export const BOARD_VISIBILITIES = [
  "private",
  "link_viewer",
  "link_editor",
  "public_viewer",
] as const;
export const boardVisibilitySchema = z.enum(BOARD_VISIBILITIES);
export type BoardVisibility = z.infer<typeof boardVisibilitySchema>;

export const socketTicketResponseSchema = z.object({
  expiresAt: z.iso.datetime({ offset: true }),
  ticket: z.string().min(32).max(128),
});
export type SocketTicketResponse = z.infer<typeof socketTicketResponseSchema>;

export const workerErrorResponseSchema = z.object({
  error: z.string().min(1),
});

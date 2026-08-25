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

export const COLLAB_OBJECT_TYPES = ["text", "note", "stroke"] as const;
export const collabObjectTypeSchema = z.enum(COLLAB_OBJECT_TYPES);
export type CollabObjectType = z.infer<typeof collabObjectTypeSchema>;

export const collabPointSchema = z.object({
  x: z.number().finite().min(0).max(2000),
  y: z.number().finite().min(0).max(1200),
});

export const collabObjectSchema = z.object({
  id: z.string().min(1).max(80),
  type: collabObjectTypeSchema,
  visitorId: z.string().min(1).max(80),
  visitorName: z.string().min(1).max(80),
  avatarUrl: z.string().max(2048).nullable(),
  content: z.string().max(160).default(""),
  x: z.number().finite().min(0).max(2000),
  y: z.number().finite().min(0).max(1200),
  width: z.number().finite().min(24).max(360),
  height: z.number().finite().min(24).max(240),
  points: z.array(collabPointSchema).max(160).default([]),
  color: z.string().max(24),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
  hidden: z.boolean().default(false),
});
export type CollabObject = z.infer<typeof collabObjectSchema>;

export const presencePlayerSchema = z.object({
  visitorId: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  avatarUrl: z.string().max(2048).nullable(),
  color: z.string().max(24),
  x: z.number().finite().min(0).max(2000),
  y: z.number().finite().min(0).max(1200),
  direction: z.enum(["up", "down", "left", "right"]),
  moving: z.boolean(),
  sequence: z.number().int().nonnegative(),
});
export type PresencePlayer = z.infer<typeof presencePlayerSchema>;

export const visitorSessionSchema = z.object({
  visitor: z.object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(80),
    avatarUrl: z.string().max(2048).nullable(),
    color: z.string().max(24),
    isAdmin: z.boolean(),
  }),
  token: z.string().min(32),
});
export type VisitorSession = z.infer<typeof visitorSessionSchema>;

export const collabSpaceStateSchema = z.object({
  objects: z.array(collabObjectSchema),
  activeVisitors: z.number().int().nonnegative(),
  totalContributors: z.number().int().nonnegative(),
});
export type CollabSpaceState = z.infer<typeof collabSpaceStateSchema>;

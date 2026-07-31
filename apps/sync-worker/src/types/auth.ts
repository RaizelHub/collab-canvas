import type { BoardRole } from "@collab-canvas/shared";

export type { BoardRole } from "@collab-canvas/shared";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface BoardAuthorization {
  role: BoardRole;
  user: AuthenticatedUser;
}

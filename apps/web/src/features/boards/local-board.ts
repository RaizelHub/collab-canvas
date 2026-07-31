import { z } from "zod";

export const localBoardSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  lastOpenedAt: z.iso.datetime(),
});

export const localBoardsSchema = z.array(localBoardSchema);

export type LocalBoard = z.infer<typeof localBoardSchema>;

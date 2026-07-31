import { DurableObject } from "cloudflare:workers";
import { z } from "zod";

import { deleteBoardState } from "./board-lifecycle";

const cleanupJobSchema = z.object({
  attempts: z.number().int().nonnegative(),
  boardId: z.uuid(),
});

type CleanupJob = z.infer<typeof cleanupJobSchema>;

const JOB_KEY = "cleanup-job";
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

export class BoardDeletionCoordinator extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/cleanup" || request.method !== "POST") {
      return new Response("Not found.", { status: 404 });
    }
    const job = cleanupJobSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!job.success) {
      return new Response("Invalid cleanup job.", { status: 400 });
    }
    await this.ctx.storage.put(JOB_KEY, job.data);
    this.ctx.waitUntil(this.runCleanup(job.data));
    return new Response(null, { status: 202 });
  }

  override async alarm(): Promise<void> {
    const job = cleanupJobSchema.safeParse(
      await this.ctx.storage.get<CleanupJob>(JOB_KEY),
    );
    if (job.success) await this.runCleanup(job.data);
  }

  private async runCleanup(job: CleanupJob): Promise<void> {
    try {
      await deleteBoardState(this.env, job.boardId);
      await this.ctx.storage.deleteAll();
    } catch (error) {
      const attempts = job.attempts + 1;
      await this.ctx.storage.put(JOB_KEY, { ...job, attempts });
      await this.ctx.storage.setAlarm(
        Date.now() +
          Math.min(MAX_RETRY_DELAY_MS, 2 ** Math.min(attempts, 10) * 1000),
      );
      console.error("Board storage cleanup deferred.", {
        attempts,
        boardId: job.boardId,
        error: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }
}

export async function scheduleBoardCleanup(
  env: Env,
  boardId: string,
): Promise<void> {
  const coordinator = env.BOARD_DELETIONS.get(
    env.BOARD_DELETIONS.idFromName(boardId),
  );
  const response = await coordinator.fetch(
    "https://board-deletion.internal/cleanup",
    {
      method: "POST",
      body: JSON.stringify({ attempts: 0, boardId }),
    },
  );
  if (!response.ok) throw new Error("Board cleanup could not be scheduled.");
}

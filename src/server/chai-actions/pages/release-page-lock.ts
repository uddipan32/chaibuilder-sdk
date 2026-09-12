import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, schema } from "~/server/chai-actions/db";

export class ReleasePageLockAction extends ChaiBaseAction<{ pageId: string }, { ok: boolean }> {
  protected getValidationSchema() {
    return z.object({ pageId: z.string().min(1) });
  }

  async execute({ pageId }: { pageId: string }) {
    const { userId, appId } = this.context!;
    if (!userId) return { ok: false };
    // Only clear if this user is the current editor (prevent race where new owner clears their own lock)
    await db
      .update(schema.appPages)
      .set({ currentEditor: null })
      .where(
        and(
          eq(schema.appPages.id, pageId),
          eq(schema.appPages.app, appId),
          eq(schema.appPages.currentEditor, userId),
        ),
      );
    return { ok: true };
  }
}

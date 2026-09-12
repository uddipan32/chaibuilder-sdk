import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, schema } from "~/server/chai-actions/db";

export class AcquirePageLockAction extends ChaiBaseAction<{ pageId: string }, { ok: boolean }> {
  protected getValidationSchema() {
    return z.object({ pageId: z.string().min(1) });
  }

  async execute({ pageId }: { pageId: string }) {
    const { userId, appId } = this.context!;
    await db
      .update(schema.appPages)
      .set({ currentEditor: userId })
      .where(and(eq(schema.appPages.id, pageId), eq(schema.appPages.app, appId)));
    return { ok: true };
  }
}

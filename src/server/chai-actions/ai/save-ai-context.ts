import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { ActionError } from "../action-error";
import { ChaiBaseAction } from "../base-action";

type SaveAiContextActionData = {
  type: "app" | "page";
  aiData: any;
  pageId?: string;
};

export class SaveAiContextAction extends ChaiBaseAction<SaveAiContextActionData, { success: boolean }> {
  protected getValidationSchema() {
    return z.object({
      type: z.enum(["app", "page"]),
      aiData: z.any(),
      pageId: z.string().optional(),
    });
  }

  async execute(data: SaveAiContextActionData): Promise<{ success: boolean }> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    const { appId } = this.context;

    // Validate aiData is present
    if (data.aiData === undefined || data.aiData === null) {
      throw new ActionError("aiData is required", "INVALID_DATA");
    }

    if (data.type === "app") {
      const { error } = await safeQuery(async () => {
        await db.update(schema.apps).set({ ai: data.aiData }).where(eq(schema.apps.id, appId));
      });

      if (error) {
        throw new ActionError("Error updating app AI context", "UPDATE_ERROR", 500, error);
      }
    } else if (data.type === "page") {
      if (!data.pageId) {
        throw new ActionError("pageId is required for page context", "INVALID_DATA");
      }

      const { data: updatedPages, error } = await safeQuery(async () =>
        db
          .update(schema.appPages)
          .set({ ai: data.aiData })
          .where(and(eq(schema.appPages.id, data.pageId as string), eq(schema.appPages.app, appId)))
          .returning(),
      );

      if (error) {
        throw new ActionError("Error updating page AI context", "UPDATE_ERROR", 500, error);
      }

      if (!updatedPages || updatedPages.length === 0) {
        throw new ActionError("Page not found for this app", "NOT_FOUND", 404);
      }
    }

    return { success: true };
  }
}

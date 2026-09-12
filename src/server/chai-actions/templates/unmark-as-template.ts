import { eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "~/server/chai-actions/action-error";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";

/**
 * Data type for UnmarkAsTemplateAction
 */
export type UnmarkAsTemplateActionData = {
  id: string; // pageId to unmark
};

type UnmarkAsTemplateActionResponse = {
  success: boolean;
};

/**
 * Action to unmark a page as a template (delete from library_templates)
 */
export class UnmarkAsTemplateAction extends ChaiBaseAction<UnmarkAsTemplateActionData, UnmarkAsTemplateActionResponse> {
  /**
   * Define the validation schema for unmark as template action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1),
    });
  }

  /**
   * Execute the unmark as template action
   */
  async execute(data: UnmarkAsTemplateActionData): Promise<UnmarkAsTemplateActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { id } = data;

    // Soft delete the template by pageId
    const { error } = await safeQuery(() =>
      db
        .update(schema.libraryTemplates)
        .set({
          deletedAt: new Date().toISOString(),
          deletedBy: this.context?.userId ?? null,
        })
        .where(eq(schema.libraryTemplates.pageId, id)),
    );

    if (error) {
      throw new ActionError("Failed to unmark page as template", "DELETE_FAILED", 500, error);
    }

    return { success: true };
  }
}

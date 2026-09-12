import { eq } from "drizzle-orm";
import { pick } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { apiError } from "~/server/chai-actions/lib";
import { ChaiBaseAction } from "../base-action";

export type UpdateWebsiteFieldsActionData = {
  settings: any;
};

type UpdateWebsiteFieldsActionResponse = {
  success: boolean;
};

/**
 * Action to update website settings (theme, designTokens, etc.)
 * Matches the behavior of the old ChaiBuilderWebsite.updateWebsiteSettings method
 */
export class UpdateWebsiteFieldsAction extends ChaiBaseAction<
  UpdateWebsiteFieldsActionData,
  UpdateWebsiteFieldsActionResponse
> {
  protected getValidationSchema() {
    return z.object({
      settings: z.any(),
    });
  }

  async execute(data: UpdateWebsiteFieldsActionData): Promise<UpdateWebsiteFieldsActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;

    // Pick only the allowed columns from settings (matching old implementation)
    const columns = pick(data.settings, ["theme", "designTokens"]);
    // Fetch existing changes array from the database
    const { data: existingApp, error: fetchError } = await safeQuery(() =>
      db.select({ changes: schema.apps.changes }).from(schema.apps).where(eq(schema.apps.id, appId)),
    );
    if (fetchError) {
      throw apiError("ERROR_UPDATE_WEBSITE_FIELDS", fetchError);
    }
    const existingChanges = (existingApp[0].changes ?? []) as string[];
    // Map column names to their corresponding changes array keys
    const keyMap: Record<string, string> = {
      theme: "THEME",
      designTokens: "DESIGN_TOKENS",
    };
    const changedKeys = Object.keys(columns)
      .map((key) => keyMap[key])
      .filter(Boolean);
    const mergedChanges = [...new Set([...existingChanges, ...changedKeys])];
    // Build the update object with changes flag
    const updateData = {
      ...columns,
      changes: mergedChanges,
    };

    // Execute the update query
    const { error } = await safeQuery(() => db.update(schema.apps).set(updateData).where(eq(schema.apps.id, appId)));

    if (error) {
      throw apiError("ERROR_UPDATE_WEBSITE_FIELDS", error);
    }

    return { success: true };
  }
}

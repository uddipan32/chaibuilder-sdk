import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { ActionError } from "../action-error";
import { ChaiBaseAction } from "../base-action";

/**
 * Data type for GetTemplatesByTypeAction
 */
export type GetTemplatesByTypeActionData = {
  pageType: string;
};

type GetTemplatesByTypeActionResponse = Array<{
  id: string;
  library: string | null;
  pageId: string | null;
  pageType: string | null;
  name: string | null;
  description: string | null;
  preview: string | null;
  user: string | null;
  createdAt: string;
}>;

/**
 * Action to get templates by page type
 */
export class GetTemplatesByTypeAction extends ChaiBaseAction<
  GetTemplatesByTypeActionData,
  GetTemplatesByTypeActionResponse
> {
  /**
   * Define the validation schema for get templates by type action
   */
  protected getValidationSchema() {
    return z.object({
      pageType: z.string().min(1),
    });
  }

  /**
   * Execute the get templates by type action
   */
  async execute(data: GetTemplatesByTypeActionData): Promise<GetTemplatesByTypeActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { pageType } = data;

    // First, get the site library for this app
    const { data: siteLibrary, error: siteLibraryError } = await safeQuery(() =>
      db.query.libraries.findFirst({
        where: eq(schema.libraries.app, appId),
        columns: {
          id: true,
        },
      }),
    );

    if (siteLibraryError) {
      throw new ActionError("Failed to fetch site library", "GET_SITE_LIBRARY_FAILED", 500, siteLibraryError);
    }

    // Fetch all shared libraries (type = "shared")
    const { data: sharedLibraries, error: sharedLibrariesError } = await safeQuery(() =>
      db
        .select({
          id: schema.libraries.id,
        })
        .from(schema.libraries)
        .where(eq(schema.libraries.type, "shared")),
    );

    if (sharedLibrariesError) {
      throw new ActionError(
        "Failed to fetch shared libraries",
        "GET_SHARED_LIBRARIES_FAILED",
        500,
        sharedLibrariesError,
      );
    }

    // Build the list of library IDs to search in
    const libraryIds = [...(siteLibrary ? [siteLibrary.id] : []), ...(sharedLibraries || []).map((lib) => lib.id)];

    // If no libraries found, return empty array
    if (libraryIds.length === 0) {
      return [];
    }

    // Fetch templates matching pageType and library IDs
    const { data: templates, error: templatesError } = await safeQuery(() =>
      db
        .select({
          id: schema.libraryTemplates.id,
          library: schema.libraryTemplates.library,
          pageId: schema.libraryTemplates.pageId,
          pageType: schema.libraryTemplates.pageType,
          name: schema.libraryTemplates.name,
          description: schema.libraryTemplates.description,
          preview: schema.libraryTemplates.preview,
          user: schema.libraryTemplates.user,
          createdAt: schema.libraryTemplates.createdAt,
        })
        .from(schema.libraryTemplates)
        .where(
          and(
            eq(schema.libraryTemplates.pageType, pageType),
            inArray(schema.libraryTemplates.library, libraryIds),
            isNull(schema.libraryTemplates.deletedAt),
          ),
        ),
    );

    if (templatesError) {
      throw new ActionError("Failed to fetch templates", "GET_TEMPLATES_FAILED", 500, templatesError);
    }

    return templates || [];
  }
}

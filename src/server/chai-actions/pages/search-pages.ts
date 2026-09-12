import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "~/server/chai-actions/action-error";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";

/**
 * Data type for SearchPagesAction
 */
export type SearchPagesActionData = {
  pageType: string;
  query?: string;
};

type SearchPagesActionResponse = Array<{
  id: string;
  slug: string;
  name: string;
  lang: string;
  primaryPage?: string | null;
}>;

/**
 * Action to search pages by type and query
 */
export class SearchPagesAction extends ChaiBaseAction<SearchPagesActionData, SearchPagesActionResponse> {
  /**
   * Define the validation schema for search pages action
   */
  protected getValidationSchema() {
    return z.object({
      pageType: z.string().min(1),
      query: z.string().optional(),
    });
  }

  /**
   * Execute the search pages action
   */
  async execute(data: SearchPagesActionData): Promise<SearchPagesActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { pageType, query = "" } = data;

    // Check if query is a UUID (length 36)
    const isUuid = this.isUUID(query);

    // Build the where conditions
    // Note: Removed isNull(primaryPage) to include language variants
    const baseConditions = [
      eq(schema.appPages.app, appId),
      eq(schema.appPages.pageType, pageType),
      isNull(schema.appPages.deletedAt),
    ];

    // Add query conditions if provided
    let whereCondition;
    if (query) {
      if (isUuid) {
        // If UUID, search by exact ID match
        whereCondition = and(...baseConditions, eq(schema.appPages.id, query));
      } else {
        // Otherwise, search by slug or name using case-insensitive LIKE
        whereCondition = and(
          ...baseConditions,
          or(ilike(schema.appPages.slug, `%${query}%`), ilike(schema.appPages.name, `%${query}%`)),
        );
      }
    } else {
      whereCondition = and(...baseConditions);
    }

    // Execute the query using safeQuery
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          slug: schema.appPages.slug,
          name: schema.appPages.name,
          lang: schema.appPages.lang,
          primaryPage: schema.appPages.primaryPage,
        })
        .from(schema.appPages)
        .where(whereCondition),
    );

    if (error) {
      throw new ActionError("Failed to search pages", "ERROR_SEARCHING_PAGES", 500, error);
    }

    return pages || [];
  }

  /**
   * Check if a string is a UUID (length 36)
   */
  private isUUID(query: string): boolean {
    return query.length === 36;
  }
}

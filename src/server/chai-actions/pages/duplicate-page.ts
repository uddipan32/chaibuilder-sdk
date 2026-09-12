import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "~/server/chai-actions/action-error";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { routingTagsForMutation } from "~/server/chai-builder/public/page-routing-cache";

/**
 * Data type for DuplicatePageAction
 */
export type DuplicatePageActionData = {
  pageId: string;
  name: string;
  slug?: string;
};

export type DuplicatePageActionResponse = {
  id: string;
  tags: string[];
};

/**
 * Action to duplicate a page
 */
export class DuplicatePageAction extends ChaiBaseAction<DuplicatePageActionData, DuplicatePageActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.object({
      pageId: z.string().nonempty(),
      name: z.string().nonempty(),
      slug: z.string().optional(),
    });
  }

  /**
   * Execute the duplicate page action
   */
  async execute(data: DuplicatePageActionData): Promise<DuplicatePageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;

    // Validate slug uniqueness if provided
    if (data.slug) {
      const slugExists = await this.doesSlugExist(data.slug);
      if (slugExists) {
        throw new ActionError("Slug already exists", "SLUG_EXISTS");
      }
    }

    const { data: originalPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(
          eq(schema.appPages.id, data.pageId),
          eq(schema.appPages.app, appId),
          isNull(schema.appPages.deletedAt),
        ),
      }),
    );

    if (error) {
      throw error;
    }

    // Validate original page exists
    if (!originalPage) {
      throw new ActionError("Page not found", "PAGE_NOT_FOUND");
    }

    const duplicatedPageData = {
      ...originalPage,
      id: undefined,
      createdAt: undefined,
      name: data.name,
      currentEditor: null,
      changes: null,
      online: false,
      libRefId: null,
      lastSaved: null,
      createdBy: this.context.userId,
      ...(data.slug && { slug: data.slug }),
    };

    const [result] = await db.insert(schema.appPages).values(duplicatedPageData).returning();

    if (!result) {
      throw new ActionError("Failed to create duplicate page", "INSERT_FAILED");
    }

    return {
      id: result.id,
      tags: routingTagsForMutation(result.id, {
        slugs: data.slug ? { new: data.slug } : undefined,
      }),
    };
  }

  private async doesSlugExist(slug: string): Promise<boolean> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
    const { appId } = this.context;
    const { data: existingPage, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.slug, slug), eq(schema.appPages.app, appId), isNull(schema.appPages.deletedAt)),
        columns: {
          id: true,
        },
      }),
    );

    if (error) {
      throw new ActionError(`${error.message}`, "SLUG_CHECK_FAILED");
    }
    return !!existingPage;
  }
}

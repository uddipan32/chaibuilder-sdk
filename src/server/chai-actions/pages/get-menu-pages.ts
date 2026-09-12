import { and, asc, eq, isNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { apiError } from "~/server/chai-actions/lib";
import { ChaiBaseAction } from "../base-action";

export type GetMenuPagesActionData = {
  lang?: string;
};

export type GetMenuPagesActionResponse = Array<{
  id: string;
  name: string;
  slug: string;
}>;

/**
 * Static, non-deleted, non-dynamic app pages for the Payload Menus URL picker.
 * App-scoped via the chai action context (`this.context.appId`).
 */
export class GetMenuPagesAction extends ChaiBaseAction<GetMenuPagesActionData, GetMenuPagesActionResponse> {
  protected getValidationSchema() {
    return z.object({
      lang: z.string().optional(),
    });
  }

  async execute(data: GetMenuPagesActionData): Promise<GetMenuPagesActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const lang = data?.lang ?? "";
    const appPages = schema.appPages;

    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: appPages.id,
          name: appPages.name,
          slug: appPages.slug,
        })
        .from(appPages)
        .where(
          and(
            eq(appPages.app, appId),
            isNull(appPages.deletedAt),
            isNull(appPages.primaryPage),
            eq(appPages.dynamic, false),
            ne(appPages.slug, ""),
            // Folders never render — their URLs 404, so they can't be menu targets
            or(isNull(appPages.pageType), ne(appPages.pageType, "_folder")),
            or(eq(appPages.lang, ""), eq(appPages.lang, lang)),
          ),
        )
        .orderBy(asc(appPages.name)),
    );

    if (error) {
      throw apiError("ERROR_GETTING_MENU_PAGES", error);
    }

    return pages ?? [];
  }
}

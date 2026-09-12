import { and, eq, isNull, or } from "drizzle-orm";
import { omit } from "lodash-es";
import { z } from "zod";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { apiError } from "~/server/chai-actions/lib";

export type GetLanguagePagesActionData = {
  id: string;
};

type GetLanguagePagesActionResponse = Array<{
  id: string;
  name: string;
  slug: string;
  lang: string;
  primaryPage?: string | null;
  pageType?: string | null;
  seo: any;
  currentEditor?: string | null;
  online: boolean | null;
  parent?: string | null;
  metadata: any;
  dynamic: boolean | null;
  dynamicSlugCustom: string | null;
  changes: string[];
  tracking?: Record<string, any> | null;
  globalJsonLds: string[];
}>;

export class GetLanguagePagesAction extends ChaiBaseAction<GetLanguagePagesActionData, GetLanguagePagesActionResponse> {
  protected getValidationSchema() {
    return z.object({
      id: z.string(),
    });
  }

  async execute(data: GetLanguagePagesActionData): Promise<GetLanguagePagesActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }

    const { appId } = this.context;
    const { id } = data;

    // Get all language pages for the given page ID (primary page or the page itself)
    const { data: pages, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          name: schema.appPages.name,
          slug: schema.appPages.slug,
          lang: schema.appPages.lang,
          primaryPage: schema.appPages.primaryPage,
          pageType: schema.appPages.pageType,
          seo: schema.appPages.seo,
          currentEditor: schema.appPages.currentEditor,
          online: schema.appPages.online,
          parent: schema.appPages.parent,
          metadata: schema.appPages.metadata,
          dynamic: schema.appPages.dynamic,
          dynamicSlugCustom: schema.appPages.dynamicSlugCustom,
          changes: schema.appPages.changes,
          tracking: schema.appPages.tracking,
          globalJsonLds: schema.appPages.globalJsonLds,
        })
        .from(schema.appPages)
        .where(
          and(
            eq(schema.appPages.app, appId),
            or(eq(schema.appPages.primaryPage, id), eq(schema.appPages.id, id)),
            isNull(schema.appPages.deletedAt),
          ),
        ),
    );

    if (error) {
      throw apiError("LANGUAGE_PAGES_ERROR", error);
    }

    // Remove the app field from each page (omit function from lodash)
    return pages.map((page) => omit(page, ["app"]) as GetLanguagePagesActionResponse[0]);
  }
}

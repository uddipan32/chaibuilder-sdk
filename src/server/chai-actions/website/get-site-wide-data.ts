import { and, eq } from "drizzle-orm";
import { each, isEmpty } from "lodash-es";
import { z } from "zod";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { apiError } from "~/server/chai-actions/lib";
import { ChaiBaseAction } from "../base-action";

type BlocksWithDesignTokens = Record<string, Record<string, string>>;
export interface SiteWideUsage {
  [pageId: string]: {
    name: string;
    isPartial: boolean;
    partialBlocks: string[];
    links: string[];
    designTokens: BlocksWithDesignTokens; // { TokenName: {blockId: Name, blockId: name 2}}
  };
}
/**
 * Data type for GenerateSeoFieldAction
 */
type GetSiteWideDataActionData = undefined;

type GetSiteWideDataActionResponse = SiteWideUsage;

/**
 * Action to generate SEO fields for a page
 */
export class GetSiteWideDataAction extends ChaiBaseAction<GetSiteWideDataActionData, GetSiteWideDataActionResponse> {
  /**
   * Define the validation schema for duplicate page action
   */
  protected getValidationSchema() {
    return z.undefined();
  }

  /**
   * Execute the duplicate page action
   */
  async execute(): Promise<GetSiteWideDataActionResponse> {
    if (!this.context) {
      throw apiError("CONTEXT_NOT_SET", new Error("CONTEXT_NOT_SET"));
    }
    const { appId } = this.context;
    const { data: blocksData, error } = await safeQuery(() =>
      db
        .select({
          id: schema.appPages.id,
          designTokens: schema.appPages.designTokens,
          name: schema.appPages.name,
          slug: schema.appPages.slug,
          links: schema.appPages.links,
          partialBlocks: schema.appPages.partialBlocks,
        })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.lang, ""), eq(schema.appPages.app, appId))),
    );

    if (error) {
      throw apiError("FETCH_SITE_DATA_FAILED", error);
    }

    const siteWideData: SiteWideUsage = {};
    each(blocksData, (page) => {
      siteWideData[page.id] = {
        name: page.name,
        isPartial: isEmpty(page.slug),
        partialBlocks: !page.partialBlocks ? [] : page.partialBlocks?.split("|").filter(Boolean),
        links: !page.links ? [] : page.links.split("|").filter(Boolean),
        designTokens: (page.designTokens ?? {}) as BlocksWithDesignTokens,
      };
    });
    return siteWideData;
  }
}

import { eq } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "~/server/chai-actions/action-error";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { ChaiBlock } from "~/types/common";

/**
 * Data type for UpdatePageAction
 */
export type GetCompareDataActionData = {
  versions: {
    version1: { type: "draft" | "revision" | "live"; id: string };
    version2: { type: "draft" | "revision" | "live"; id: string };
  };
};

type GetCompareDataActionResponse = {
  version1: {
    blocks: ChaiBlock[];
    seo: object;
    tracking: object;
  };
  version2: {
    blocks: ChaiBlock[];
    seo: object;
    tracking: object;
  };
};

/**
 * Action to update a page
 */
export class GetCompareDataAction extends ChaiBaseAction<GetCompareDataActionData, GetCompareDataActionResponse> {
  /**
   * Define the validation schema for update page action
   */
  protected getValidationSchema() {
    return z.object({
      versions: z.object({
        version1: z.object({
          type: z.enum(["draft", "revision", "live"]),
          id: z.string(),
        }),
        version2: z.object({
          type: z.enum(["draft", "revision", "live"]),
          id: z.string(),
        }),
      }),
    });
  }

  /**
   * Execute the update page action
   */
  async execute(data: GetCompareDataActionData): Promise<GetCompareDataActionResponse> {
    this.validateContext();

    // Get blocks for version1
    const version1Data = await this.getBlocksForVersion(data.versions.version1.type, data.versions.version1.id);

    // Get blocks for version2
    const version2Data = await this.getBlocksForVersion(data.versions.version2.type, data.versions.version2.id);

    return {
      version1: {
        blocks: version1Data.blocks,
        seo: version1Data.seo,
        tracking: version1Data.tracking
      },
      version2: {
        blocks: version2Data.blocks,
        seo: version2Data.seo,
        tracking: version2Data.tracking
      },
    };
  }

  /**
   * Get blocks from the appropriate table based on type
   */
  private async getBlocksForVersion(
    type: "draft" | "revision" | "live",
    id: string,
  ): Promise<{ blocks: ChaiBlock[]; seo: any, tracking: any }> {
    let data;
    let error;

    switch (type) {
      case "draft":
        // Get blocks from app_pages table
        ({ data, error } = await safeQuery(() =>
          db.query.appPages.findFirst({
            where: eq(schema.appPages.id, id),
            columns: {
              blocks: true,
              seo: true,
              tracking: true
            },
          }),
        ));
        break;

      case "live":
        // Get blocks from app_pages_online table
        ({ data, error } = await safeQuery(() =>
          db.query.appPagesOnline.findFirst({
            where: eq(schema.appPagesOnline.id, id),
            columns: {
              blocks: true,
              seo: true,
              tracking: true
            },
          }),
        ));
        break;

      case "revision":
        // Get blocks from app_pages_revisions table
        // Note: revisions use 'uid' as primary key
        ({ data, error } = await safeQuery(() =>
          db.query.appPagesRevisions.findFirst({
            where: eq(schema.appPagesRevisions.uid, id),
            columns: {
              blocks: true,
              seo: true,
              tracking: true
            },
          }),
        ));
        break;

      default:
        throw new ActionError(`Invalid version type: ${type}`, "INVALID_VERSION_TYPE");
    }

    if (error) {
      throw new ActionError(`Failed to fetch blocks for ${type} version: ${error.message}`, "FETCH_BLOCKS_ERROR");
    }

    if (!data) {
      throw new ActionError(`No data found for ${type} version with id: ${id}`, "VERSION_NOT_FOUND");
    }

    // Return blocks or empty array if blocks is null/undefined
    return {
      blocks: (data.blocks as ChaiBlock[]) || [],
      seo: data.seo || {},
      tracking: data.tracking || {}
    };
  }

  /**
   * Validate that context is properly set
   */
  private validateContext(): void {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }
  }
}

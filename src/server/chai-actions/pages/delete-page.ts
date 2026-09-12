import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { ActionError } from "~/server/chai-actions/action-error";
import { ChaiBaseAction } from "~/server/chai-actions/base-action";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { apiError } from "~/server/chai-actions/lib";
import type { PageTreeNode } from "~/server/chai-actions/utils/page-tree-builder";
import { PageTreeBuilder } from "~/server/chai-actions/utils/page-tree-builder";
import { routingTagsForPages } from "~/server/chai-builder/public/page-routing-cache";

/**
 * Data type for DeletePageAction
 */
export type DeletePageActionData = {
  id: string;
  permanent?: boolean;
};

export type DeletePageActionResponse = {
  tags: string[];
  page?: any;
  deletedLanguagePages?: number;
  deletedNestedChildren?: number;
  totalDeleted?: number;
  code?: string;
  editor?: string;
};

/**
 * Action to delete a page and all its associated data
 * This includes:
 * - The page itself
 * - All nested children pages
 * - All language variant pages
 * - Language variants of nested children
 */
export class DeletePageAction extends ChaiBaseAction<DeletePageActionData, DeletePageActionResponse> {
  private appId: string = "";
  private userId: string = "";
  private permanent: boolean = false;
  private pageTreeBuilder?: PageTreeBuilder;

  /**
   * Define the validation schema for delete page action
   */
  protected getValidationSchema() {
    return z.object({
      id: z.string().min(1, "Page ID is required"),
      permanent: z.boolean().optional(),
    });
  }

  /**
   * Execute the delete page action
   */
  async execute(data: DeletePageActionData): Promise<DeletePageActionResponse> {
    if (!this.context) {
      throw new ActionError("Context not set", "CONTEXT_NOT_SET");
    }

    this.appId = this.context.appId;
    this.userId = this.context.userId || "";
    this.permanent = data.permanent || false;

    try {
      // Initialize PageTreeBuilder with ORM
      this.pageTreeBuilder = new PageTreeBuilder(this.appId);

      // Execute the delete operation
      return await this.deletePage(data.id);
    } catch (error) {
      // Handle known errors
      if (error instanceof ActionError) {
        throw error;
      }

      // Convert other errors to ActionError
      const message = error instanceof Error ? error.message : "Failed to delete page";
      throw new ActionError(message, "DELETE_PAGE_ERROR");
    }
  }

  /**
   * Main delete page logic
   */
  public async deletePage(id: string): Promise<any> {
    await this.assertNotHomepage(id);

    // Check if page is currently being edited by another user
    const currentEditor = await this.getCurrentEditor(id);
    if (currentEditor && currentEditor !== this.userId) {
      return { tags: [], code: "PAGE_LOCKED", editor: currentEditor };
    }

    const pagesTree = await this.pageTreeBuilder!.getPagesTree();

    const pageInLanguageTree = this.pageTreeBuilder!.findPageInLanguageTree(id, pagesTree.languageTree);
    const pageInPrimaryTree = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!pageInLanguageTree && !pageInPrimaryTree) {
      throw apiError("ERROR_DELETING_PAGE", "Page not found");
    }

    const isLanguagePage = pageInLanguageTree !== null;

    if (isLanguagePage) {
      return await this.deleteLanguagePageWithTree(id, pageInLanguageTree!, pagesTree);
    } else {
      return await this.deletePrimaryPageWithTree(id, pagesTree);
    }
  }

  /**
   * The homepage owns "/" — deleting it (or trashing it) would leave the site
   * without a root route, so it can only go away by handing "/" to another
   * page first (promotion demotes the current homepage automatically).
   *
   * Only the primary row at "/" is protected: language variants live at
   * "/<lang>", and an already-trashed row is exempt so a permanent delete can
   * still clear pages trashed before this rule existed.
   */
  private async assertNotHomepage(id: string): Promise<void> {
    const { data: page, error } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId)),
        columns: { slug: true, primaryPage: true, deletedAt: true },
      }),
    );

    if (error) {
      throw new ActionError(`Failed to fetch page: ${error.message}`, "FETCH_FAILED");
    }

    // Missing or out-of-app row: the tree lookup below reports it as not found.
    if (!page) return;

    if (page.slug === "/" && !page.primaryPage && !page.deletedAt) {
      throw new ActionError(
        "The homepage cannot be deleted. Make another page the homepage first.",
        "HOMEPAGE_DELETE_FORBIDDEN",
      );
    }
  }

  /**
   * Perform Deletion With Ids using Drizzle ORM
   */
  public async performDeletionWithIds(ids: string[]): Promise<any> {
    const reverseIds = [...ids].reverse();

    // Delete from library_templates
    if (this.permanent) {
      const { error: libError } = await safeQuery(() =>
        db.delete(schema.libraryTemplates).where(inArray(schema.libraryTemplates.pageId, reverseIds)),
      );
      if (libError) throw apiError("DELETE_FAILED", libError);
    }

    // Delete from app_pages_revisions
    if (this.permanent) {
      const { error: revError } = await safeQuery(() =>
        db.delete(schema.appPagesRevisions).where(inArray(schema.appPagesRevisions.id, reverseIds)),
      );
      if (revError) throw apiError("DELETE_FAILED", revError);
    }

    // Delete from app_pages
    const { error: pagesError } = await safeQuery(() =>
      this.permanent
        ? db.delete(schema.appPages).where(inArray(schema.appPages.id, reverseIds))
        : db
            .update(schema.appPages)
            .set({ deletedAt: new Date().toISOString(), deletedBy: this.userId })
            .where(inArray(schema.appPages.id, reverseIds)),
    );
    if (pagesError) throw apiError("DELETE_FAILED", pagesError);

    // Delete from app_pages_online
    const { error: onlineError } = await safeQuery(() =>
      db.delete(schema.appPagesOnline).where(inArray(schema.appPagesOnline.id, reverseIds)),
    );
    if (onlineError) throw apiError("DELETE_FAILED", onlineError);
  }

  /**
   * Collect routing tags from tree nodes for deleted pages
   */
  private collectRoutingTagsFromTree(ids: string[], tree: PageTreeNode[]): string[] {
    const nodes: Array<{ id: string; slug?: string; primaryPage?: string | null }> = [];

    const walk = (treeNodes: PageTreeNode[]) => {
      for (const node of treeNodes) {
        if (ids.includes(node.id)) {
          nodes.push({ id: node.id, slug: node.slug, primaryPage: node.primaryPage });
        }
        if (node.children.length > 0) {
          walk(node.children);
        }
      }
    };

    walk(tree);
    return routingTagsForPages(nodes);
  }

  /**
   * Delete a language page using tree data
   */
  public async deleteLanguagePageWithTree(id: string, langNode: any, pagesTree: any): Promise<any> {
    const primaryPageId = langNode.primaryPage;
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(primaryPageId, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }
    const allNestedLanguageIds = this.pageTreeBuilder!.collectNestedChildIds(langNode);
    const deletedIds = [id, ...allNestedLanguageIds];

    await this.performDeletionWithIds(deletedIds);
    return {
      tags: this.collectRoutingTagsFromTree(deletedIds, pagesTree.languageTree),
      totalDeleted: deletedIds.length,
    };
  }

  /**
   * Delete a primary page using tree data
   */
  public async deletePrimaryPageWithTree(id: string, pagesTree: any): Promise<any> {
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_DELETING_PAGE", "Primary page not found");
    }
    const nestedPrimaryChildIds = this.pageTreeBuilder!.collectNestedChildIds(primaryNode);

    const languageVariants = this.pageTreeBuilder!.findLanguagePagesForPrimary(id, pagesTree.languageTree);
    const languagePageIds: string[] = [];

    languageVariants.forEach((langVariant) => {
      languagePageIds.push(langVariant.id);
      const nestedIds = this.pageTreeBuilder!.collectNestedChildIds(langVariant);
      languagePageIds.push(...nestedIds);
    });

    const allLanguagePageIds = [...new Set([...nestedPrimaryChildIds, ...languagePageIds])];
    const deletedIds = [id, ...allLanguagePageIds];
    await this.performDeletionWithIds(deletedIds);
    return {
      tags: [
        ...this.collectRoutingTagsFromTree(deletedIds, pagesTree.primaryTree),
        ...this.collectRoutingTagsFromTree(deletedIds, pagesTree.languageTree),
      ].filter((tag, index, arr) => arr.indexOf(tag) === index),
      totalDeleted: deletedIds.length,
    };
  }

  /**
   * Get current editor for a page
   */
  public async getCurrentEditor(id: string): Promise<string | null> {
    const { data, error } = await safeQuery(() =>
      db
        .select({ currentEditor: schema.appPages.currentEditor })
        .from(schema.appPages)
        .where(and(eq(schema.appPages.id, id), eq(schema.appPages.app, this.appId)))
        .limit(1),
    );

    if (error || !data || data.length === 0) return null;
    return data[0]?.currentEditor || null;
  }

  /**
   * Restore a page and all its nested children and language pages
   */
  public async restorePage(id: string): Promise<void> {
    if (!this.pageTreeBuilder) {
      this.pageTreeBuilder = new PageTreeBuilder(this.context!.appId);
    }

    const pagesTree = await this.pageTreeBuilder.getPagesTree();

    const pageInLanguageTree = this.pageTreeBuilder.findPageInLanguageTree(id, pagesTree.languageTree);
    const pageInPrimaryTree = this.pageTreeBuilder.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!pageInLanguageTree && !pageInPrimaryTree) {
      throw apiError("ERROR_RESTORING_PAGE", "Page not found");
    }

    const isLanguagePage = pageInLanguageTree !== null;

    if (isLanguagePage) {
      await this.restoreLanguagePageWithTree(id, pageInLanguageTree!, pagesTree);
    } else {
      await this.restorePrimaryPageWithTree(id, pagesTree);
    }
  }

  /**
   * Restore a language page and its nested children
   */
  private async restoreLanguagePageWithTree(id: string, langNode: any, _pagesTree: any): Promise<void> {
    const allNestedLanguageIds = this.pageTreeBuilder!.collectNestedChildIds(langNode);
    const allIds = [id, ...allNestedLanguageIds];

    const { error } = await safeQuery(() =>
      db.update(schema.appPages).set({ deletedAt: null, deletedBy: null }).where(inArray(schema.appPages.id, allIds)),
    );

    if (error) {
      throw apiError("RESTORE_FAILED", error);
    }
  }

  /**
   * Restore a primary page, its nested children, and all language variants
   */
  private async restorePrimaryPageWithTree(id: string, pagesTree: any): Promise<void> {
    const primaryNode = this.pageTreeBuilder!.findPageInPrimaryTree(id, pagesTree.primaryTree);

    if (!primaryNode) {
      throw apiError("ERROR_RESTORING_PAGE", "Primary page not found");
    }

    const nestedPrimaryChildIds = this.pageTreeBuilder!.collectNestedChildIds(primaryNode);

    const languageVariants = this.pageTreeBuilder!.findLanguagePagesForPrimary(id, pagesTree.languageTree);
    const languagePageIds: string[] = [];

    languageVariants.forEach((langVariant) => {
      languagePageIds.push(langVariant.id);
      const nestedIds = this.pageTreeBuilder!.collectNestedChildIds(langVariant);
      languagePageIds.push(...nestedIds);
    });

    const allIds = [id, ...nestedPrimaryChildIds, ...languagePageIds];

    const { error } = await safeQuery(() =>
      db.update(schema.appPages).set({ deletedAt: null, deletedBy: null }).where(inArray(schema.appPages.id, allIds)),
    );

    if (error) {
      throw apiError("RESTORE_FAILED", error);
    }
  }
}

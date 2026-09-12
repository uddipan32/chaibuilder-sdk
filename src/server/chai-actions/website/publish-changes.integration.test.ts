import { describe, expect, it } from "vitest";
import { slugTag } from "~/server/chai-builder/public/page-routing-cache";
import { fake } from "~/tests/setup/fakers";
import { withTestDB } from "~/tests/setup/transaction-manager";
import { PublishChangesAction } from "./publish-changes";

describe("PublishChangesAction - Integration", () => {
  it("should include tags and paths of linking pages when publishing a page", async () => {
    await withTestDB(async ({ seed, action }) => {
      // 1. Create a page in appPages (the one being published)
      const pageToPublish = await seed(
        "appPages",
        fake.appPages({
          slug: "/target-page",
        }),
      );

      // 2. Create another page in appPagesOnline that links to the target page
      // Using pipe separation to match how links are stored in the real app
      const linkingPage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/linking-page",
          links: `some-id|${pageToPublish.id}|another-id`,
        }),
      );

      // 3. Run PublishChangesAction for the target page
      const result = await action(PublishChangesAction).run({
        ids: [pageToPublish.id],
      });

      // 4. Verify tags and paths for the published page itself
      expect(result.tags).toContain(`page-${pageToPublish.id}`);
      expect(result.paths).toContain("/target-page");

      // First publish counts as a slug change
      expect(result.tags).toContain(`page-slug:${pageToPublish.id}`);

      // 5. Verify that the linking page's tag and path are also included
      expect(result.tags).toContain(`page-${linkingPage.id}`);
      expect(result.paths).toContain("/linking-page");
    });
  });

  it("should not fan out to linking pages when publishing without a slug change", async () => {
    await withTestDB(async ({ seed, action }) => {
      // Page already online with the same slug (content-only publish)
      const pageToPublish = await seed("appPages", fake.appPages({ slug: "/target" }));
      await seed("appPagesOnline", fake.appPagesOnline({ id: pageToPublish.id, slug: "/target" }));

      const linkingPage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/linking-page",
          links: `${pageToPublish.id}`,
        }),
      );

      const result = await action(PublishChangesAction).run({
        ids: [pageToPublish.id],
      });

      expect(result.tags).toContain(`page-${pageToPublish.id}`);
      expect(result.paths).toContain("/target");

      // No slug change: no slug tag invalidation, no linking-page fan-out
      expect(result.tags).not.toContain(`page-slug:${pageToPublish.id}`);
      expect(result.tags).not.toContain(`page-${linkingPage.id}`);
      expect(result.paths).not.toContain("/linking-page");
    });
  });

  it("should fan out to linking pages and bust old slug when the slug changes", async () => {
    await withTestDB(async ({ seed, action }) => {
      const pageToPublish = await seed("appPages", fake.appPages({ slug: "/new-slug" }));
      await seed("appPagesOnline", fake.appPagesOnline({ id: pageToPublish.id, slug: "/old-slug" }));

      const linkingPage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/linking-page",
          links: `${pageToPublish.id}`,
        }),
      );

      const result = await action(PublishChangesAction).run({
        ids: [pageToPublish.id],
      });

      expect(result.tags).toContain(`page-slug:${pageToPublish.id}`);
      expect(result.tags).toContain(slugTag("/old-slug"));
      expect(result.tags).toContain(slugTag("/new-slug"));
      expect(result.paths).toContain("/new-slug");

      expect(result.tags).toContain(`page-${linkingPage.id}`);
      expect(result.paths).toContain("/linking-page");
    });
  });

  it("should handle multiple linking pages and uniqify the results", async () => {
    await withTestDB(async ({ seed, action }) => {
      const pageToPublish = await seed("appPages", fake.appPages({ slug: "/target" }));

      const linkingPage1 = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/link-1",
          links: `${pageToPublish.id}`,
        }),
      );

      const linkingPage2 = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/link-2",
          links: `|${pageToPublish.id}|`,
        }),
      );

      const result = await action(PublishChangesAction).run({
        ids: [pageToPublish.id],
      });

      expect(result.tags).toContain(`page-${linkingPage1.id}`);
      expect(result.paths).toContain("/link-1");
      expect(result.tags).toContain(`page-${linkingPage2.id}`);
      expect(result.paths).toContain("/link-2");

      // Ensure the page itself is also there
      expect(result.tags).toContain(`page-${pageToPublish.id}`);
      expect(result.paths).toContain("/target");

      // Ensure tags and paths are de-duplicated
      expect(result.tags.length).toBe(new Set(result.tags).size);
      expect(result.paths.length).toBe(new Set(result.paths).size);
    });
  });

  it("should not include pages that do not link to the published page", async () => {
    await withTestDB(async ({ seed, action }) => {
      const pageToPublish = await seed("appPages", fake.appPages({ slug: "/target" }));

      const nonLinkingPage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/non-linking",
          links: "completely-different-id",
        }),
      );

      const result = await action(PublishChangesAction).run({
        ids: [pageToPublish.id],
      });

      expect(result.tags).not.toContain(`page-${nonLinkingPage.id}`);
      expect(result.paths).not.toContain("/non-linking");
    });
  });

  it("should fan out to pages linking to a language variant id when its slug changes", async () => {
    await withTestDB(async ({ seed, action }) => {
      const primaryPage = await seed("appPages", fake.appPages({ slug: "/primary" }));
      const langPage = await seed(
        "appPages",
        fake.appPages({ slug: "/fr/nouveau", lang: "fr", primaryPage: primaryPage.id }),
      );

      // Linker references the language variant id, not the primary id
      const linkingPage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/linking-page",
          links: `${langPage.id}`,
        }),
      );

      const result = await action(PublishChangesAction).run({
        ids: [langPage.id],
      });

      expect(result.tags).toContain(`page-slug:${primaryPage.id}`);
      expect(result.tags).toContain(`page-slug:${langPage.id}`);
      expect(result.tags).toContain(`page-${linkingPage.id}`);
      expect(result.paths).toContain("/linking-page");
    });
  });

  it("should include tags and paths of pages using a partial block when publishing a partial", async () => {
    await withTestDB(async ({ seed, action }) => {
      // 1. Create a partial page in appPages (no slug)
      const partialPage = await seed(
        "appPages",
        fake.appPages({
          slug: "", // Partial
        }),
      );

      // 2. Create another page in appPagesOnline that uses this partial
      const usagePage = await seed(
        "appPagesOnline",
        fake.appPagesOnline({
          slug: "/using-partial",
          partialBlocks: `some-id|${partialPage.id}|another-id`,
        }),
      );

      // 3. Run PublishChangesAction for the partial page
      const result = await action(PublishChangesAction).run({
        ids: [partialPage.id],
      });

      // 4. Verify tags and paths for the page using the partial
      expect(result.tags).toContain(`page-${usagePage.id}`);
      expect(result.paths).toContain("/using-partial");
    });
  });
});

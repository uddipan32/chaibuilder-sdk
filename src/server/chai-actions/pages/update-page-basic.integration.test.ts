import { describe, expect, it } from "vitest";
import { fake } from "~/tests/setup/fakers";
import { withTestDB } from "~/tests/setup/transaction-manager";
import { getPageById } from "~/tests/utils/assertions";
import { UpdatePageAction } from "./update-page";

describe("UpdatePageAction - Basic Updates Integration", () => {
  it("should successfully update basic page fields", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      // 1. Arrange
      const page = await seed("appPages", fake.appPages({ name: "Old Name", buildTime: false }));

      const payload = {
        id: page.id,
        name: "New Page Name",
        seo: { title: "SEO Title" },
        currentEditor: "editor123",
        pageType: "blog",
      };

      // 2. Act
      const result = await action(UpdatePageAction).run(payload);

      // 3. Assert
      expect(result.page).toBeDefined();
      expect(result.page.name).toBe("New Page Name");

      const updatedPage = await getPageById(db, page.id);
      expect(updatedPage).not.toBeNull();
      expect(updatedPage?.name).toBe("New Page Name");
      expect((updatedPage?.seo as any)?.title).toBe("SEO Title");
      expect(updatedPage?.currentEditor).toBe("editor123");
      expect(updatedPage?.pageType).toBe("blog");

      expect(updatedPage?.changes).toContain("SEO");
      expect(updatedPage?.changes).not.toContain("Page");

      expect(result.tags).toContain(`page-${page.id}`);
      expect(result.tags).toContain(`breadcrumb-${page.id}`);
    });
  });

  it("merges a description into metadata, preserving existing metadata keys", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      const page = await seed("appPages", fake.appPages({ slug: "", metadata: { keep: "me" } }));

      await action(UpdatePageAction).run({
        id: page.id,
        name: "Header Partial",
        description: "Reusable site header.",
      });

      const updatedPage = await getPageById(db, page.id);
      expect(updatedPage?.name).toBe("Header Partial");
      expect(updatedPage?.metadata).toEqual({ keep: "me", description: "Reusable site header." });
    });
  });

  it("overwrites an existing description on update", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      const page = await seed("appPages", fake.appPages({ slug: "", metadata: { description: "old" } }));

      await action(UpdatePageAction).run({ id: page.id, description: "new" });

      const updatedPage = await getPageById(db, page.id);
      expect((updatedPage?.metadata as any)?.description).toBe("new");
    });
  });

  it("merges tags into metadata without clobbering description or other keys", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      const page = await seed(
        "appPages",
        fake.appPages({ slug: "", metadata: { keep: "me", description: "Reusable header." } }),
      );

      await action(UpdatePageAction).run({ id: page.id, tags: ["Section", "Header"] });

      const updatedPage = await getPageById(db, page.id);
      expect(updatedPage?.metadata).toEqual({
        keep: "me",
        description: "Reusable header.",
        __tags: ["Section", "Header"],
      });
    });
  });

  it("updates description and tags together, preserving existing metadata", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      const page = await seed("appPages", fake.appPages({ slug: "", metadata: { keep: "me" } }));

      await action(UpdatePageAction).run({
        id: page.id,
        description: "Updated description.",
        tags: ["  CTA  ", "cta", "Testimonial"],
      });

      const updatedPage = await getPageById(db, page.id);
      expect(updatedPage?.metadata).toEqual({
        keep: "me",
        description: "Updated description.",
        __tags: ["CTA", "Testimonial"],
      });
    });
  });

  it("does not touch tags when the update omits them", async () => {
    await withTestDB(async ({ db, seed, action }) => {
      const page = await seed(
        "appPages",
        fake.appPages({ slug: "", metadata: { __tags: ["Existing"], description: "old" } }),
      );

      await action(UpdatePageAction).run({ id: page.id, description: "new" });

      const updatedPage = await getPageById(db, page.id);
      expect((updatedPage?.metadata as any)?.__tags).toEqual(["Existing"]);
      expect((updatedPage?.metadata as any)?.description).toBe("new");
    });
  });

  it("returns page details tags only for seo-only updates", async () => {
    await withTestDB(async ({ seed, action }) => {
      const page = await seed("appPages", fake.appPages());

      const result = await action(UpdatePageAction).run({
        id: page.id,
        seo: { title: "SEO Title" },
      });

      expect(result.tags).toEqual([`page-${page.id}`]);
    });
  });
});

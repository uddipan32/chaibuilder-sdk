import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { ActionError } from "~/server/chai-actions/action-error";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { pageSlugTag, routingTagsForMutation } from "~/server/chai-builder/public/page-routing-cache";

const homepageSuffix = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 4);

export type HomepageSlugUpdate = { id: string; oldSlug: string; newSlug: string };

/**
 * Recomputes a child slug when its ancestor's slug changes. A "/" ancestor
 * (old or new) contributes no path segment, so it is joined as an empty prefix
 * rather than replaced verbatim.
 */
export function rewriteChildSlug(childSlug: string, ancestorOldSlug: string, ancestorNewSlug: string): string {
  const newPrefix = ancestorNewSlug === "/" ? "" : ancestorNewSlug;
  if (ancestorOldSlug === "/") {
    return `${newPrefix}${childSlug}`;
  }
  if (childSlug === ancestorOldSlug) {
    return ancestorNewSlug;
  }
  if (childSlug.startsWith(ancestorOldSlug + "/")) {
    return `${newPrefix}${childSlug.slice(ancestorOldSlug.length)}`;
  }
  return childSlug;
}

/**
 * Walks the parent tree below a renamed page and returns the slug rewrite for
 * every descendant whose slug embedded the old ancestor slug.
 */
export async function collectDescendantSlugUpdates(
  appId: string,
  rootId: string,
  rootOldSlug: string,
  rootNewSlug: string,
): Promise<HomepageSlugUpdate[]> {
  const updates: HomepageSlugUpdate[] = [];
  const visited = new Set<string>([rootId]);
  let frontier: HomepageSlugUpdate[] = [{ id: rootId, oldSlug: rootOldSlug, newSlug: rootNewSlug }];

  while (frontier.length > 0) {
    const parentIds = frontier.map((node) => node.id);
    const { data: children, error } = await safeQuery(() =>
      db
        .select({ id: schema.appPages.id, slug: schema.appPages.slug, parent: schema.appPages.parent })
        .from(schema.appPages)
        .where(
          and(
            inArray(schema.appPages.parent, parentIds),
            eq(schema.appPages.app, appId),
            isNull(schema.appPages.deletedAt),
          ),
        ),
    );
    if (error) {
      throw new ActionError(`Failed to look up descendant pages: ${error.message}`, "HOMEPAGE_DEMOTE_FAILED");
    }

    const next: HomepageSlugUpdate[] = [];
    for (const child of children ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const parentNode = frontier.find((node) => node.id === child.parent)!;
      const oldSlug = child.slug ?? "";
      const newSlug = oldSlug ? rewriteChildSlug(oldSlug, parentNode.oldSlug, parentNode.newSlug) : oldSlug;
      if (newSlug !== oldSlug) {
        updates.push({ id: child.id, oldSlug, newSlug });
      }
      next.push({ id: child.id, oldSlug, newSlug });
    }
    frontier = next;
  }

  return updates;
}

/**
 * Applies slug rewrites to the draft table and, for rows that are published,
 * the live table (rows absent from the live table are simply unaffected).
 */
export async function applySlugRewrites(appId: string, updates: HomepageSlugUpdate[]): Promise<void> {
  for (const update of updates) {
    const { error } = await safeQuery(() =>
      db
        .update(schema.appPages)
        .set({ slug: update.newSlug, lastSaved: new Date().toISOString() })
        .where(and(eq(schema.appPages.id, update.id), eq(schema.appPages.app, appId))),
    );
    if (error) {
      throw new ActionError(`Failed to rewrite slug for page ${update.id}`, "HOMEPAGE_DEMOTE_FAILED");
    }
    const { error: onlineError } = await safeQuery(() =>
      db
        .update(schema.appPagesOnline)
        .set({ slug: update.newSlug })
        .where(and(eq(schema.appPagesOnline.id, update.id), eq(schema.appPagesOnline.app, appId))),
    );
    if (onlineError) {
      throw new ActionError(`Failed to rewrite live slug for page ${update.id}`, "HOMEPAGE_DEMOTE_FAILED");
    }
  }
}

/**
 * Finds the page (other than excludePageId) currently owning the "/" slug.
 */
export async function findExistingHomepage(
  appId: string,
  excludePageId?: string,
): Promise<{ id: string } | null> {
  const { data: existing, error } = await safeQuery(() =>
    db.query.appPages.findFirst({
      where: and(
        eq(schema.appPages.slug, "/"),
        eq(schema.appPages.app, appId),
        isNull(schema.appPages.deletedAt),
        ...(excludePageId ? [ne(schema.appPages.id, excludePageId)] : []),
      ),
      columns: { id: true },
    }),
  );

  if (error) {
    throw new ActionError(`Failed to look up existing homepage: ${error.message}`, "HOMEPAGE_LOOKUP_FAILED");
  }

  return existing ?? null;
}

/**
 * Hands the "/" slug over to a new homepage: the page currently at "/" is
 * renamed to /homepage-<id> (its language variants follow) and taken offline
 * along with them, so the incoming page can claim the root path.
 *
 * No-op when no other page owns "/". Returns the cache tags to revalidate.
 *
 * Demoting rewrites and unpublishes a page the caller did not name, so callers
 * must gate this on `pages:update` + `pages:unpublish` when a homepage exists.
 */
export async function demoteExistingHomepage(appId: string, excludePageId?: string): Promise<string[]> {
  const existing = await findExistingHomepage(appId, excludePageId);

  if (!existing) {
    return [];
  }

  // Language variants of the homepage live at "/<lang>" — move them with it.
  // Loaded before picking the new slug so the collision check below can cover
  // every destination the rename produces, not just the primary one.
  const { data: languageVariants, error: variantsError } = await safeQuery(() =>
    db
      .select({ id: schema.appPages.id, slug: schema.appPages.slug, lang: schema.appPages.lang })
      .from(schema.appPages)
      .where(
        and(
          eq(schema.appPages.primaryPage, existing.id),
          eq(schema.appPages.app, appId),
          isNull(schema.appPages.deletedAt),
        ),
      ),
  );

  if (variantsError) {
    throw new ActionError(
      `Failed to look up homepage language variants: ${variantsError.message}`,
      "HOMEPAGE_DEMOTE_FAILED",
    );
  }

  const variants = (languageVariants ?? []).filter((variant) => variant.slug && variant.lang);
  const variantLangs = variants.map((variant) => variant.lang!);

  const newSlug = await generateFreeHomepageSlug(appId, variantLangs);

  const slugUpdates: Array<{ id: string; oldSlug: string; newSlug: string }> = [
    { id: existing.id, oldSlug: "/", newSlug },
    ...variants.map((variant) => ({
      id: variant.id,
      oldSlug: variant.slug!,
      newSlug: `/${variant.lang}${newSlug}`,
    })),
  ];

  // Descendants embed their ancestor's slug ("/team" under "/"), so they move
  // with it — otherwise a child of the demoted homepage could collide with a
  // child of the incoming one. They stay published: only the homepage and its
  // language variants are unpublished.
  const descendantUpdates: HomepageSlugUpdate[] = [];
  for (const node of slugUpdates) {
    descendantUpdates.push(...(await collectDescendantSlugUpdates(appId, node.id, node.oldSlug, node.newSlug)));
  }

  // Rename and take offline in the draft table
  for (const update of slugUpdates) {
    const { error: updateError } = await safeQuery(() =>
      db
        .update(schema.appPages)
        .set({ slug: update.newSlug, online: false, lastSaved: new Date().toISOString() })
        .where(and(eq(schema.appPages.id, update.id), eq(schema.appPages.app, appId))),
    );
    if (updateError) {
      throw new ActionError("Failed to demote existing homepage", "HOMEPAGE_DEMOTE_FAILED");
    }
  }

  await applySlugRewrites(appId, descendantUpdates);

  // Deliberately no `page:slug-changed` hook here: that hook means "moved and
  // still reachable" and would make the redirects plugin create redirects to —
  // and retarget existing redirects onto — /homepage-* URLs that are
  // unpublished the moment this function returns. Demotion is an unpublish;
  // like TakeOfflineAction, it emits no redirects.

  // Remove from the live table — the old homepage is unpublished, not moved
  const { error: deleteError } = await safeQuery(() =>
    db.delete(schema.appPagesOnline).where(and(eq(schema.appPagesOnline.id, existing.id), eq(schema.appPagesOnline.app, appId))),
  );
  if (deleteError) {
    throw new ActionError("Failed to unpublish existing homepage", "HOMEPAGE_DEMOTE_FAILED");
  }
  const { error: deleteVariantsError } = await safeQuery(() =>
    db.delete(schema.appPagesOnline).where(and(eq(schema.appPagesOnline.primaryPage, existing.id), eq(schema.appPagesOnline.app, appId))),
  );
  if (deleteVariantsError) {
    throw new ActionError("Failed to unpublish existing homepage language variants", "HOMEPAGE_DEMOTE_FAILED");
  }

  // pageSlugTag per id: the live rows were deleted, so the warmed id -> slug
  // resolver entries must be busted too (routingTagsForMutation omits them
  // because ordinary mutations never touch the online table).
  const allUpdates = [...slugUpdates, ...descendantUpdates];
  return [
    ...new Set([
      ...routingTagsForMutation(existing.id, { slugUpdates: allUpdates }),
      ...allUpdates.map((update) => pageSlugTag(update.id)),
    ]),
  ];
}

/**
 * Picks a /homepage-<id> slug where neither the slug itself nor any of its
 * language-prefixed destinations (/<lang>/homepage-<id>) is already used by
 * another page in the app.
 */
async function generateFreeHomepageSlug(appId: string, variantLangs: string[]): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `/homepage-${homepageSuffix()}`;
    const destinations = [candidate, ...variantLangs.map((lang) => `/${lang}${candidate}`)];
    const { data: taken, error: lookupError } = await safeQuery(() =>
      db.query.appPages.findFirst({
        where: and(
          inArray(schema.appPages.slug, destinations),
          eq(schema.appPages.app, appId),
          isNull(schema.appPages.deletedAt),
        ),
        columns: { id: true },
      }),
    );
    if (lookupError) {
      throw new ActionError(`Failed to check slug availability: ${lookupError.message}`, "HOMEPAGE_DEMOTE_FAILED");
    }
    if (!taken) {
      return candidate;
    }
  }
  throw new ActionError("Could not find a free slug for the old homepage", "HOMEPAGE_DEMOTE_FAILED");
}

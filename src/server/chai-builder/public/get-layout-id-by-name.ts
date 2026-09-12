import { and, asc, eq, isNull, or } from "drizzle-orm";
import { consola } from "consola";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getInitializedState } from "../state";
import { withChaiCache } from "./cache-utils";

export const LAYOUTS_INDEX_TAG = "layouts-index";

export function layoutIdByNameCacheKey(appId: string, name: string): string[] {
  return [`layout-id-by-name-${appId}-${name}`];
}

export function layoutIdByNameCacheTags(): string[] {
  return [LAYOUTS_INDEX_TAG];
}

/** Draft → appPages (editable). Online → appPagesOnline (published). */
export function getLayoutPagesTable(draftMode: boolean) {
  return draftMode ? schema.appPages : schema.appPagesOnline;
}

/**
 * Pick the oldest layout id from rows already ordered by createdAt asc.
 * Collision → warn; oldest wins (`id` prop on WithChaiLayout is the escape hatch).
 */
export function pickOldestLayoutId(rows: { id: string }[], name: string): string | null {
  if (rows.length === 0) return null;
  if (rows.length > 1) {
    consola.warn(
      `[getLayoutIdByName] Multiple layouts named "${name}"; using oldest (id=${rows[0]!.id}). Pass id= to disambiguate.`,
    );
  }
  return rows[0]!.id;
}

export async function fetchLayoutIdByName(
  appId: string,
  draftMode: boolean,
  name: string,
): Promise<string | null> {
  const table = getLayoutPagesTable(draftMode);
  const { data, error } = await safeQuery(() =>
    db
      .select({ id: table.id })
      .from(table)
      .where(
        and(
          eq(table.app, appId),
          eq(table.pageType, "_layout"),
          eq(table.name, name),
          or(eq(table.slug, ""), isNull(table.slug)),
          isNull(table.deletedAt),
        ),
      )
      .orderBy(asc(table.createdAt))
      .limit(2),
  );

  if (error) {
    consola.warn(`[getLayoutIdByName] Query failed for name="${name}":`, error);
    return null;
  }

  return pickOldestLayoutId(data ?? [], name);
}

/**
 * Resolve a `_layout` page id by its display name.
 * Draft mode → request-cached (fresh). Production → persistent cache, tag `layouts-index`, TTL 300s.
 */
export async function getLayoutIdByName(name: string): Promise<string | null> {
  const state = getInitializedState();

  return await withChaiCache(
    fetchLayoutIdByName,
    layoutIdByNameCacheKey(state.appId!, name),
    layoutIdByNameCacheTags(),
    300,
    "fetchLayoutIdByName",
  )(state.appId!, state.draftMode, name);
}

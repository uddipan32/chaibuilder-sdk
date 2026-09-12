import { and, eq, inArray, or } from "drizzle-orm";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getInitializedState } from "../state";

export type GlobalJsonLdEntry = { id: string; jsonld: unknown };

type GlobalJsonLdRow = { id: string; primaryPage: string | null; jsonld: unknown; lang: string | null };

/**
 * For each requested id, pick the matching row (by id or primaryPage), preferring
 * the current language then the default-language (`lang: ''`) row. Pure so the
 * language-preference logic is unit-tested without a DB. Preserves id order.
 */
export function pickGlobalJsonLds(rows: GlobalJsonLdRow[], ids: string[], lang: string): GlobalJsonLdEntry[] {
  const result: GlobalJsonLdEntry[] = [];
  for (const id of ids) {
    const matches = rows.filter((r) => r.id === id || r.primaryPage === id);
    const picked = matches.find((r) => (r.lang || "") === lang) ?? matches.find((r) => (r.lang || "") === "");
    if (picked) result.push({ id: picked.id, jsonld: picked.jsonld });
  }
  return result;
}

/**
 * Resolves a page's `globalJsonLds` id references into their actual JSON-LD
 * documents — the shared Car/Vehicle and AutomotiveBusiness/AutoDealer schemas
 * the public routes render via `page.globalJsonLdsData`. Ports staging's
 * `db/supabase/getFullPage.ts` resolver, which the 2.0 SDK page loaders dropped.
 *
 * For each requested id, pick the row whose `id` or `primaryPage` matches,
 * preferring the current language, then the default-language (`lang: ''`) row.
 * Returns entries in the same order as the requested ids.
 *
 * Always reads `app_pages_online`: the shared `_GlobalJSONLD` schema records are
 * only ever stored in the online table (draft pages keep just the id list), so a
 * draft-aware select would find nothing and drop every shared schema in builder
 * previews (matches staging, which also queried the online table unconditionally).
 */
export async function getPageGlobalJSONLds(ids: string[], lang: string): Promise<GlobalJsonLdEntry[]> {
  if (!ids || ids.length === 0) return [];
  const state = getInitializedState();
  const table = schema.appPagesOnline;

  const { data, error } = await safeQuery(() =>
    db
      .select({ id: table.id, primaryPage: table.primaryPage, jsonld: table.jsonld, lang: table.lang })
      .from(table)
      .where(and(eq(table.app, state.appId!), or(inArray(table.id, ids), inArray(table.primaryPage, ids)))),
  );

  if (error) {
    // Fail open: a DB error shouldn't blank the page's other SEO. Log so it's not
    // silently indistinguishable from "no matching schema rows".
    console.error("getPageGlobalJSONLds: query failed", error);
    return [];
  }

  return pickGlobalJsonLds(data ?? [], ids, lang);
}

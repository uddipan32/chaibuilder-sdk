import { and, eq, inArray } from "drizzle-orm";
import { chunk } from "lodash-es";
import { db, safeQuery, schema } from "~/server/chai-actions/db";
import { getConfigFeature } from "~/server/defaults/config-registry";
import type { ChaiServerFeatures } from "~/types/server-config";

/**
 * Uids per DELETE. Every uid is a bind parameter, and a page pruned for the first time can have a
 * backlog of thousands, so the list is split rather than sent as one `IN (...)`: SQLite rejects a
 * statement over SQLITE_MAX_VARIABLE_NUMBER (999 by default) and Postgres over 65535. A single
 * oversized DELETE would fail whole and prune nothing — exactly the backlog that needs it most.
 */
const DELETE_CHUNK_SIZE = 500;

type RevisionRow = { uid: string; createdAt: string };

/**
 * The uids to drop: everything past the newest `maxRevisions`.
 *
 * Sorted here rather than in SQL so the pg (timestamp) and sqlite (text) createdAt columns order
 * the same way. Both store an ISO-ish string, which compares chronologically.
 */
export function selectStaleRevisionUids(revisions: RevisionRow[], maxRevisions: number): string[] {
  if (maxRevisions <= 0 || revisions.length <= maxRevisions) return [];

  return [...revisions]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0))
    .slice(maxRevisions)
    .map((revision) => revision.uid);
}

/**
 * Drop the oldest revisions of a page once it holds more than `features.revisions.maxRevisions`.
 *
 * Called after a revision is written, never before: the new row is what pushes the page over the
 * cap, and pruning first would keep the count one short. `maxRevisions: 0` keeps every revision.
 *
 * Soft-fails. A revision that outlives the cap is harmless; a save or publish that dies because
 * cleanup failed is not. A failed chunk does not abandon the rest — pruning most of a backlog beats
 * pruning none of it.
 */
export async function pruneRevisions(pageId: string, appId: string): Promise<void> {
  // Read structurally: the shape belongs to the revisions plugin, and without it registered
  // the key is absent — no revisions were ever written, so there is nothing to prune. The cast
  // is the same story at the type level: `revisions` only enters ChaiServerFeatures when a
  // plugin augments the interface, so core cannot name it as a known key.
  const maxRevisions =
    (getConfigFeature("revisions" as keyof ChaiServerFeatures) as { maxRevisions?: number } | undefined)
      ?.maxRevisions ?? 0;
  if (maxRevisions <= 0) return;

  try {
    const { data: revisions, error } = await safeQuery(() =>
      db
        .select({ uid: schema.appPagesRevisions.uid, createdAt: schema.appPagesRevisions.createdAt })
        .from(schema.appPagesRevisions)
        .where(and(eq(schema.appPagesRevisions.id, pageId), eq(schema.appPagesRevisions.app, appId))),
    );

    if (error || !revisions) return;

    const stale = selectStaleRevisionUids(revisions, maxRevisions);
    if (stale.length === 0) return;

    for (const uids of chunk(stale, DELETE_CHUNK_SIZE)) {
      const { error: deleteError } = await safeQuery(() =>
        db
          .delete(schema.appPagesRevisions)
          .where(and(eq(schema.appPagesRevisions.app, appId), inArray(schema.appPagesRevisions.uid, uids))),
      );

      if (deleteError) {
        console.error("Error pruning page revisions:", { pageId, count: uids.length, error: deleteError });
      }
    }
  } catch (error) {
    console.error("Error pruning page revisions:", { pageId, error });
  }
}

import { chunk } from "lodash-es";
import { describe, expect, it } from "vitest";
import { selectStaleRevisionUids } from "./prune-revisions";

const revision = (uid: string, createdAt: string) => ({ uid, createdAt });

describe("selectStaleRevisionUids", () => {
  it("keeps the newest maxRevisions and returns the rest oldest-last", () => {
    const revisions = [
      revision("old", "2026-01-01T00:00:00Z"),
      revision("newest", "2026-01-03T00:00:00Z"),
      revision("middle", "2026-01-02T00:00:00Z"),
    ];

    expect(selectStaleRevisionUids(revisions, 2)).toEqual(["old"]);
  });

  it("returns nothing when the page is at or under the cap", () => {
    const revisions = [revision("a", "2026-01-01T00:00:00Z"), revision("b", "2026-01-02T00:00:00Z")];

    expect(selectStaleRevisionUids(revisions, 2)).toEqual([]);
    expect(selectStaleRevisionUids(revisions, 5)).toEqual([]);
    expect(selectStaleRevisionUids([], 2)).toEqual([]);
  });

  it("keeps every revision when maxRevisions is 0", () => {
    const revisions = [revision("a", "2026-01-01T00:00:00Z"), revision("b", "2026-01-02T00:00:00Z")];

    expect(selectStaleRevisionUids(revisions, 0)).toEqual([]);
  });

  it("orders sqlite-style timestamps the same as pg-style ones", () => {
    // sqlite stores `datetime('now')` text; pg an ISO timestamp. Both compare chronologically.
    const revisions = [
      revision("old", "2026-01-01 00:00:00"),
      revision("new", "2026-01-02 00:00:00"),
      revision("mid", "2026-01-01 12:00:00"),
    ];

    expect(selectStaleRevisionUids(revisions, 1)).toEqual(["mid", "old"]);
  });

  it("splits a large retroactive backlog into chunks under the SQLite bind-param limit", () => {
    // The case that motivated chunking: a page pruned for the first time after years of publishes.
    const revisions = Array.from({ length: 5000 }, (_, i) =>
      revision(`uid-${i}`, `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`),
    );

    const stale = selectStaleRevisionUids(revisions, 20);
    expect(stale).toHaveLength(4980);

    const chunks = chunk(stale, 500);
    expect(chunks).toHaveLength(10);
    // +1 for the appId bind param; must stay under SQLite's default 999.
    expect(Math.max(...chunks.map((c) => c.length)) + 1).toBeLessThan(999);
    expect(chunks.flat()).toEqual(stale);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ safeQuery: vi.fn() }));

// `state.fallbackLang` is deliberately the WRONG "en" placeholder here — the value
// the metadata request path actually carries. The fix must ignore it and label
// alternates from the `fallbackLang` argument (resolved from real site settings).
vi.mock("../state", () => ({
  getInitializedState: () => ({ appId: "app-1", draftMode: false, fallbackLang: "en" }),
}));

vi.mock("./cache-utils", () => ({ withChaiCache: (fn: any) => fn }));

vi.mock("~/server/chai-actions/db", () => ({
  db: {},
  safeQuery: mocks.safeQuery,
  schema: { appPages: {}, appPagesOnline: {} },
}));

import { getAlternateLangPages } from "./get-alternate-lang-pages";

// A French primary VDP (empty `lang` column) and its English language variant.
const FR_PRIMARY = { id: "fr-1", name: "FR", slug: "/inventaire-neuf", lang: "", dynamic: true, primaryPage: null };
const EN_VARIANT = {
  id: "en-1",
  name: "EN",
  slug: "/en/new-inventory",
  lang: "en",
  dynamic: true,
  primaryPage: "fr-1",
};

beforeEach(() => {
  mocks.safeQuery.mockReset().mockResolvedValue({ data: [FR_PRIMARY, EN_VARIANT] });
});

describe("getAlternateLangPages", () => {
  it("labels the empty-lang primary with the passed site fallback, not state.fallbackLang", async () => {
    // Request is the EN variant → the FR primary is its only alternate. With the site
    // fallback "fr" it must be labeled `fr`, never `en` (which would collide with and
    // overwrite the EN page's own self-hreflang).
    const alts = await getAlternateLangPages("fr-1", "en-1", "fr");
    expect(alts).toEqual([
      { id: "fr-1", name: "FR", slug: "/inventaire-neuf", lang: "fr", dynamic: true, primaryLang: true },
    ]);
  });

  it("excludes only the requested page by id", async () => {
    // Request is the FR primary → its only alternate is the EN variant (labeled by its
    // own explicit lang).
    const alts = await getAlternateLangPages("fr-1", "fr-1", "fr");
    expect(alts).toEqual([
      { id: "en-1", name: "EN", slug: "/en/new-inventory", lang: "en", dynamic: true, primaryLang: false },
    ]);
  });
});

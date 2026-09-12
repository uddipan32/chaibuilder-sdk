// Bump when partial-merge *output* changes. `fetchFullPage` (get-full-page.ts) persistently
// caches the merged blocks, and the Data Cache outlives deployments, so without a key change an
// older deploy's merge keeps being served. `getPageStyles` (get-page-styles.ts) keys its
// persistent cache on this too — compiled page CSS is a function of the *merged* blocks, and its
// key carries no blocks hash. Lives in its own module so the styles path doesn't have to import
// the full page-fetch implementation (and its DB dependencies) for one constant.
// v2: partial merge no longer broadcasts a reference's `_show: true` onto inlined children, so
// previously-cached blocks that un-hid authored `_show: false` forks (e.g. duplicate/promo
// header variants) must be re-merged.
// v3: MAX_PARTIAL_DEPTH went 2 → 3, so cached depth-2 merges that left a third-level partial
// unexpanded (the Hyundai header social row) must be re-merged.
export const FULL_PAGE_MERGE_VERSION = "3";

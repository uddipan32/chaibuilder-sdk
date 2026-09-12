/**
 * Render data-provider blocks *inline* in the document instead of streaming
 * them through a `<Suspense>` boundary. **On by default**; set
 * `CHAI_DISABLE_INLINE_DATA_PROVIDERS=true` to fall back to streaming.
 *
 * ## Why
 *
 * Every block with a `dataProvider` is wrapped in `<Suspense>` by
 * `RenderBlock`. React's streaming SSR therefore emits the **fallback**
 * skeleton in document flow (`<!--$?--><template id="B:n">`) and appends the
 * real markup at the end of the document inside `<div hidden id="S:n">`,
 * relying on React's inline `$RC(...)` to unhide it on the client.
 *
 * With JavaScript disabled that swap never runs, so the content stays hidden
 * forever. Measured on a staging listing page: of 115 vehicle links, **101 sat
 * inside hidden containers** and the visible flow held only an
 * `aria-busy="true"` pulse skeleton.
 *
 * Inline mode makes `RenderBlock` await the data-provider promise itself
 * and return the resolved element, so nothing suspends and the markup lands in
 * the shell.
 *
 * ## Cost — why awaiting per block does not waterfall
 *
 * Only the shell flush is delayed — **not** the data fetching. Two kinds of
 * provider reach `RenderBlock`, and neither serializes on real I/O:
 *
 * - **Batched providers** (`PageLinksList`, `DealerSelector`, `FilterOptions`)
 *   arrive via the `dataProviders` prop as promises already in flight:
 *   `buildBatchedDataProviders` (`lib/build-batched-data-providers.ts`) starts
 *   every one *before* rendering begins, so the inline `await` here just waits
 *   on an in-flight promise — no waterfall, concurrent with its siblings.
 * - **Fallback providers** (any other block whose config carries a
 *   `dataProvider`) are invoked per block, in render order, with no boundary to
 *   let React start a sibling's provider first — so these *would* serialize.
 *   Today they don't cost anything because every one of them is **synchronous**
 *   (returns a plain object; the host's block `dataProvider`s supply builder
 *   sample data, and the async live providers are all either batched above or
 *   left unwired — `getBlockDataProviders`/`setChaiServerBlockDataProvider` are
 *   commented out on this branch). Awaiting a synchronous return is a
 *   microtask, not latency.
 *
 * ⚠️ The moment a genuinely async (I/O) provider is added to the *fallback*
 * path — a block with a live `dataProvider` that is not batched — inline mode
 * will await it serially against every other such block on the page, turning
 * independent fetches into a TTFB waterfall on cache MISS. Batch it (add it to
 * `batchDataProviderDefinitions`) or otherwise precompute it into
 * `dataProviders` so it starts before render.
 *
 * The added latency on a cache MISS is otherwise `max(provider latency)`, which
 * the streaming path already paid before the page was usable; pages are
 * ISR-cached, so a hit is unaffected either way.
 *
 * Measured (occasion-beaucage preview, same commit, flag on vs off):
 * cache HIT unchanged (~0.08s either way, Vercel replays buffered HTML);
 * warm cache MISS ~+95ms; cold start ~+200-300ms. CLS *improved* 0.02 -> 0.00
 * and LCP 231ms -> 210ms, since the skeleton swap is gone.
 *
 * ## Why opt-out rather than opt-in
 *
 * Content being invisible without JavaScript is a correctness bug, not a
 * tuning preference, so the fixed behaviour is the default and the escape
 * hatch disables it. The kill switch exists because the streaming path is what
 * every site ran for a long time: if a specific project regresses on TTFB
 * (a slow uncached data provider on a `force-dynamic` route is the plausible
 * case), it can be reverted per project without a deploy.
 *
 * Read at call time rather than module scope so tests can toggle it without
 * resetting the module registry.
 */
export const shouldInlineDataProviders = (): boolean => process.env.CHAI_DISABLE_INLINE_DATA_PROVIDERS !== "true";

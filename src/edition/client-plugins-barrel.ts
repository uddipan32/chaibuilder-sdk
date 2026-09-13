/**
 * Edition-owned (never synced): what `<pkg>/plugins/client` re-exports in the open-source edition.
 *
 * Hosts name the plugins they want and pass them to the builder:
 *
 * ```tsx
 * import { pageErrorsClientPlugin } from "<pkg>/plugins/page-errors/client";
 *
 * <ChaiWebsiteBuilder plugins={[pageErrorsClientPlugin]} ... />
 * ```
 *
 * Importing from this barrel still works and still tree-shakes under a
 * bundler, but the per-plugin subpaths (`<pkg>/plugins/<name>/client`) are
 * the load-bearing guarantee — nothing you did not name can reach the chunk.
 */
export { emptyPageStarterClientPlugin } from "~/plugins/empty-page-starter/client";
export { pageErrorsClientPlugin } from "~/plugins/page-errors/client";

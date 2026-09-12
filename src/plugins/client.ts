/**
 * Convenience barrel for the bundled client plugins.
 *
 * There is deliberately no `chaiClientPlugins()` preset: a preset makes the
 * editor bundle carry every feature UI whether or not the host uses it. Hosts
 * name the plugins they want and pass them to the builder:
 *
 * ```tsx
 * import { pageErrorsClientPlugin } from "chaicore/plugins/page-errors/client";
 *
 * <ChaiWebsiteBuilder plugins={[pageErrorsClientPlugin]} ... />
 * ```
 *
 * Importing from this barrel still works and still tree-shakes under a
 * bundler, but the per-plugin subpaths (`chaicore/plugins/<name>/client`) are
 * the load-bearing guarantee — nothing you did not name can reach the chunk.
 */
export { emptyPageStarterClientPlugin } from "./empty-page-starter/client";
export { pageErrorsClientPlugin } from "./page-errors/client";

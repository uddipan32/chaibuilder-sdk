/**
 * Server plugin barrel — what `<pkg>/plugins/server` resolves to.
 *
 * The exported set is edition-specific (the pro edition adds its plugins and the
 * `chaiProServerPlugins()` preset), so the list lives in `src/edition/server-plugins-barrel.ts`;
 * this shared file only forwards it.
 */
export * from "~/edition/server-plugins-barrel";

/**
 * Client plugin barrel — what `<pkg>/plugins/client` resolves to.
 *
 * The exported set is edition-specific (the pro edition adds its plugins), so the list lives in
 * `src/edition/client-plugins-barrel.ts`; this shared file only forwards it. Prefer the
 * per-plugin subpaths (`<pkg>/plugins/<name>/client`) so nothing you did not name reaches the
 * chunk.
 */
export * from "~/edition/client-plugins-barrel";

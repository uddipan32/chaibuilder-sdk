/**
 * Package version of ChaiBuilder Core.
 *
 * Injected by the tsup `define` at build time; falls back to a dev sentinel when
 * the source is executed directly (vitest, tsx, or a host that compiles `src/`
 * itself instead of consuming the published bundle).
 */
export const CHAI_CORE_VERSION: string =
  typeof __CHAI_CORE_VERSION__ === "string" ? __CHAI_CORE_VERSION__ : "0.0.0-dev";

/** `true` only inside the published bundle — see the `__CHAI_CORE_BUNDLED__` tsup define. */
export const IS_CHAI_CORE_BUNDLED: boolean = typeof __CHAI_CORE_BUNDLED__ === "boolean" ? __CHAI_CORE_BUNDLED__ : false;

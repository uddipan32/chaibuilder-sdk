/**
 * Runtime server-only guard.
 *
 * Why not the `server-only` package: it relies on the `react-server` export
 * condition, so any plain-Node loader (Payload's tsx-based migration/seed
 * runner, scripts, vitest) resolves its throwing entry and crashes even though
 * the code is running on the server. This guard instead throws only when the
 * module is actually evaluated in a browser, which is the failure we care
 * about: server internals leaking into a client bundle.
 *
 * Trade-off: unlike `server-only`, this is not enforced at build time for
 * client components (those also render in Node during SSR). It catches the
 * problem when the bundle executes in the browser.
 *
 * Usage: `import '~/server/only-server'` at entry/barrel chokepoints — not in
 * every internal module.
 */
import { CHAI_PACKAGE_NAME } from "~/edition/identity";

if (typeof window !== "undefined") {
  throw new Error(
    `${CHAI_PACKAGE_NAME}: server-only module imported in client/browser code. ` +
      "Import this only from server code (server components, route handlers, payload.config.ts).",
  );
}

export {};

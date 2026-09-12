/**
 * Import an optional peer dependency at runtime, invisibly to bundlers.
 *
 * Optional peers (AI provider SDKs, …) must not be resolved at
 * build time: a consumer who never uses the feature never installs the package,
 * and a static `import("pkg")` would break their build. The usual escape hatch —
 * a variable specifier plus the `webpackIgnore` / `turbopackIgnore` magic
 * comments — turned out not to be reliable: Turbopack still rewrites the call
 * into a stub that throws `MODULE_NOT_FOUND` ("Cannot find module as expression
 * is too dynamic"), so the package stays unreachable *even when it is
 * installed* — which is how a configured OpenRouter key ended up silently
 * falling back to the default AI gateway.
 *
 * Building the import with the `Function` constructor sidesteps both problems:
 * the specifier only ever exists inside a string that no bundler parses, so
 * there is nothing to resolve at build time and nothing to rewrite. Node
 * evaluates it as an ordinary native `import()` and resolves the bare specifier
 * from the host application's `node_modules`.
 *
 * Not every runtime allows that, though — a strict CSP rejects the `Function`
 * constructor outright, and a `vm` sandbox with no dynamic-import hook (Vitest,
 * some serverless isolates) rejects the call it produces. Those fall back to the
 * magic-comment import, which is what their own loader understands.
 */

type DynamicImport = (specifier: string) => Promise<unknown>;

/** Built once. `null` marks a runtime that cannot import this way. */
let nativeImport: DynamicImport | null | undefined;

function getNativeImport(): DynamicImport | null {
  if (nativeImport === undefined) {
    try {
      nativeImport = new Function("specifier", "return import(specifier)") as DynamicImport;
    } catch {
      nativeImport = null; // Function constructor blocked (CSP).
    }
  }
  return nativeImport;
}

/** The import a bundler *can* see — last resort, and a stub in some builds. */
function bundlerImport<T>(specifier: string): Promise<T> {
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ specifier) as Promise<T>;
}

function isModuleNotFound(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "ERR_MODULE_NOT_FOUND" || code === "MODULE_NOT_FOUND";
}

/**
 * Resolve `specifier` from the host application. Rejects when the package is not
 * installed; callers turn that into a feature-specific message.
 */
export async function importOptionalPeer<T>(specifier: string): Promise<T> {
  const load = getNativeImport();
  if (!load) return bundlerImport<T>(specifier);

  try {
    return (await load(specifier)) as T;
  } catch (error) {
    // A missing package is the answer, not a reason to try again.
    if (isModuleNotFound(error)) throw error;
    // Anything else means the runtime refused the call itself, so stop building
    // imports this way and let its own loader have a go.
    nativeImport = null;
    try {
      return await bundlerImport<T>(specifier);
    } catch {
      throw error;
    }
  }
}

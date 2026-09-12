import { extractTailwindCandidates } from "./candidates";
import { TAILWIND_STYLESHEETS } from "./stylesheets.generated";
import type { CompileTailwindOptions } from "./types";

type TailwindV4Compile = (
  css: string,
  options?: {
    base?: string;
    loadModule?: (
      id: string,
      base: string,
      resourceHint: "plugin" | "config",
    ) => Promise<{ path: string; base: string; module: unknown }>;
    loadStylesheet?: (id: string, base: string) => Promise<{ path: string; base: string; content: string }>;
  },
) => Promise<{ build(candidates: string[]): string }>;

const TAILWIND_CONFIG_ID = "virtual:chai-builder-tailwind-config";

// Maps Tailwind import specifiers onto the embedded stylesheet copies. All content comes from
// stylesheets.generated.ts — the compiler never touches the filesystem, so it works on serverless
// hosts and in consumer projects without any file-tracing configuration.
const STYLESHEET_IDS: Record<string, string> = {
  tailwindcss: "index.css",
  "tailwindcss/index.css": "index.css",
  "tailwindcss/theme": "theme.css",
  "tailwindcss/theme.css": "theme.css",
  "tailwindcss/preflight": "preflight.css",
  "tailwindcss/preflight.css": "preflight.css",
  "tailwindcss/utilities": "utilities.css",
  "tailwindcss/utilities.css": "utilities.css",
};

const loadStylesheet = async (id: string, base: string) => {
  const stylesheetName = STYLESHEET_IDS[id];
  const content = stylesheetName ? TAILWIND_STYLESHEETS[stylesheetName] : undefined;

  if (content === undefined) {
    throw new Error(`Unsupported Tailwind stylesheet import: ${id}`);
  }

  return { path: id, base, content };
};

/**
 * Compile Tailwind v4 CSS for the given markup strings using the embedded stylesheets.
 * Requires tailwindcss v4 to be installed.
 */
export const compileTailwindCss = async ({
  markupStrings,
  safelist = [],
  includeBaseStyles = false,
  config,
}: CompileTailwindOptions) => {
  const tailwindModule = (await import("tailwindcss")) as unknown as { compile?: TailwindV4Compile };

  if (typeof tailwindModule.compile !== "function") {
    throw new Error("Installed tailwindcss does not expose compile() — ChaiBuilder requires Tailwind v4.");
  }

  const css = includeBaseStyles
    ? `@config "${TAILWIND_CONFIG_ID}";\n@import "tailwindcss";`
    : `@config "${TAILWIND_CONFIG_ID}";\n@import "tailwindcss/theme";\n@import "tailwindcss/utilities";`;

  const compiled = await tailwindModule.compile(css, {
    base: "/",
    loadModule: async (id, base, resourceHint) => {
      if (id === TAILWIND_CONFIG_ID && resourceHint === "config") {
        return {
          path: id,
          base,
          module: config,
        };
      }

      throw new Error(`Unsupported Tailwind ${resourceHint} import: ${id}`);
    },
    loadStylesheet,
  });

  return compiled.build(extractTailwindCandidates(markupStrings, safelist));
};

import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  // src/utils/vendor: vendored third-party code, kept verbatim — its inline eslint
  // directives reference plugins (react-hooks) this config does not install.
  globalIgnores(["dist/**", "docs/**", "graphify-out/**", "node_modules/**", ".agents/**", "src/utils/vendor/**"]),
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // Plugin discipline (warn while the public core surface settles): plugins should
    // consume core through its public entry points, not deep internals. Deep imports
    // are churn hazards — they break silently when core reorganizes.
    files: ["src/plugins/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "~/builder/core/components/*/**",
                "~/builder/pages/client/components/*/**",
                "~/server/chai-builder/internal/**",
              ],
              message:
                "Plugin imports a deep core internal. Prefer public surfaces: ~/builder/register-apis, ~/server/plugin-api, ~/server/chai-actions/{base-action,base-ai-action,action-error,db}, ~/types, ~/components/ui, ~/constants.",
            },
          ],
        },
      ],
    },
  },
  {
    // Plugin boundary: core (everything outside src/plugins) must never import a
    // plugin. Dependencies point one way — plugins consume core's public surfaces,
    // never the reverse — so a violation here means a feature has leaked into core.
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    ignores: ["src/plugins/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["~/plugins", "~/plugins/*", "**/src/plugins/**"],
              message:
                "Core code must not import plugins. Invert via ~/server/plugin-api or builder register-apis.",
            },
          ],
        },
      ],
    },
  },
  {
    // Subtree boundary: this repo is vendored into host apps as a git subtree (see
    // scripts/RUNBOOK.md), so nothing here may reach up into the host app — code that
    // does compiles in the host and breaks the moment the package is built or published
    // alone.
    //
    // Deliberately the @typescript-eslint/ flavor rather than the base rule above: flat
    // config replaces a rule's options wholesale per file, so reusing `no-restricted-imports`
    // here would silently drop the plugin-discipline (warn) and plugin-boundary (error) patterns for
    // any overlapping file. Separate rule name = independent severity, disjoint concerns.
    files: ["src/**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Host apps alias their own source as @/ (Next.js default); ~~/ and #/ are the
              // other conventions in use. This repo's own alias is ~/, mapped to ./src.
              // "[#]/**" not "#/**": minimatch reads a leading # as a comment and the
              // pattern would silently never match.
              group: ["@/*", "@/**", "~~/*", "~~/**", "[#]/**"],
              message:
                "Host-app alias import. The chaicore subtree must build standalone — use ~/ (this repo's src) or a package dependency.",
            },
            {
              // Deepest legitimate import in src/ today is four levels; five would leave the
              // subtree entirely when it sits at a shallow prefix in a host repo.
              group: ["../../../../../*", "../../../../../**"],
              message:
                "Relative import climbs out of the subtree. Use the ~/ alias to reach other modules in this repo.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

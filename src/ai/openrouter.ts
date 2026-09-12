/**
 * OpenRouter provider plugin with a *static* import of the SDK.
 *
 * The built-in plugin (`src/server/chai-actions/ai-providers/openrouter.ts`)
 * loads `@openrouter/ai-sdk-provider` through `importOptionalPeer()`, an import
 * no bundler can see. That is what keeps the package optional for the hosts that
 * never use it — and also what keeps Next's output file tracing from copying it
 * into a production build: with no import edge to follow, the package is absent
 * from `.next/standalone` / the serverless bundle even though it is installed,
 * and the AI panel reports "configured but could not be loaded". `next dev`
 * resolves from `node_modules` directly, which is why it only breaks in prod.
 *
 * Hosts that ship OpenRouter register this plugin instead. It lives behind its
 * own entry point precisely because the import below is unconditional: importing
 * `<pkg>/ai/openrouter` without the package installed is a build error, so
 * only apps that depend on OpenRouter may reach for it.
 *
 * Behaviour is otherwise identical to the built-in plugin — same env vars, same
 * activation, same gateway fallback when `OPENROUTER_API_KEY` is absent.
 *
 * @example
 * ```typescript
 * // chaibuilder.config.ts
 * import { openRouterPlugin } from "<pkg>/ai/openrouter";
 *
 * buildChaiBuilderConfig({
 *   ai: { providers: [openRouterPlugin], models: [...] },
 * });
 * ```
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  isOpenRouterConfigured,
  openRouterFingerprint,
  openRouterOptions,
  OPENROUTER_PACKAGE,
  OPENROUTER_PLUGIN_ID,
  OPENROUTER_PLUGIN_LABEL,
} from "~/server/chai-actions/ai-providers/openrouter-options";
import type { ChaiAiProviderPlugin, ChaiAiSdkProvider } from "~/types/server-config";

export const openRouterPlugin: ChaiAiProviderPlugin = {
  id: OPENROUTER_PLUGIN_ID,
  label: OPENROUTER_PLUGIN_LABEL,
  packageName: OPENROUTER_PACKAGE,
  isConfigured: isOpenRouterConfigured,
  fingerprint: openRouterFingerprint,
  createProvider: (): ChaiAiSdkProvider => createOpenRouter(openRouterOptions()) as ChaiAiSdkProvider,
};

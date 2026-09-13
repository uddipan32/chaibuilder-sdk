import { importOptionalPeer } from "~/lib/import-optional-peer";
import type { ChaiAiProviderPlugin, ChaiAiSdkProvider } from "~/types/server-config";
import {
  isOpenRouterConfigured,
  openRouterFingerprint,
  openRouterOptions,
  OPENROUTER_PACKAGE,
  OPENROUTER_PLUGIN_ID,
  OPENROUTER_PLUGIN_LABEL,
  type CreateOpenRouter,
} from "./openrouter-options";

/**
 * Built-in OpenRouter adapter.
 *
 * Activated by `OPENROUTER_API_KEY`. Requires the optional peer dependency
 * `@openrouter/ai-sdk-provider` (imported lazily, only when the key is set).
 *
 * OpenRouter shares the Vercel AI Gateway's `provider/model` slug convention
 * (e.g. `anthropic/claude-sonnet-4`), so ChaiBuilder's existing model catalogue
 * works unchanged.
 *
 * The lazy import is what keeps the package optional — and what hides it from
 * bundlers, so Next's output file tracing leaves it out of a production build
 * even when it is installed. Hosts that ship OpenRouter should register
 * `<pkg>/ai/openrouter` instead, which imports the SDK statically.
 */
export const openRouterPlugin: ChaiAiProviderPlugin = {
  id: OPENROUTER_PLUGIN_ID,
  label: OPENROUTER_PLUGIN_LABEL,
  packageName: OPENROUTER_PACKAGE,
  isConfigured: isOpenRouterConfigured,
  fingerprint: openRouterFingerprint,
  createProvider: async (): Promise<ChaiAiSdkProvider> => {
    const { createOpenRouter } = await importOptionalPeer<{ createOpenRouter: CreateOpenRouter }>(OPENROUTER_PACKAGE);
    return createOpenRouter(openRouterOptions());
  },
};

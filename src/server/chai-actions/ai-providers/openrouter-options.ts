import type { ChaiAiSdkProvider } from "~/types/server-config";

/** `createOpenRouter` from `@openrouter/ai-sdk-provider`, typed structurally. */
export type CreateOpenRouter = (opts: {
  apiKey?: string;
  extraBody?: Record<string, unknown>;
  appName?: string;
  appUrl?: string;
}) => ChaiAiSdkProvider;

export const OPENROUTER_PLUGIN_ID = "openrouter";
export const OPENROUTER_PLUGIN_LABEL = "OpenRouter";
export const OPENROUTER_PACKAGE = "@openrouter/ai-sdk-provider";

/** Activated by the API key alone; everything else is optional. */
export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/** Rebuild the provider when the key rotates, reuse it otherwise. */
export function openRouterFingerprint(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

/**
 * Options `createOpenRouter` is called with, shared by the lazy plugin and the
 * statically-imported one so both behave identically.
 */
export function openRouterOptions(): Parameters<CreateOpenRouter>[0] {
  return {
    apiKey: process.env.OPENROUTER_API_KEY,
    // Enable OpenRouter usage accounting so that
    // response.providerMetadata.openrouter.usage.cost is populated for logging.
    extraBody: { usage: { include: true } },
    ...(process.env.OPENROUTER_APP_NAME ? { appName: process.env.OPENROUTER_APP_NAME } : {}),
    ...(process.env.OPENROUTER_APP_URL ? { appUrl: process.env.OPENROUTER_APP_URL } : {}),
  };
}

import type { ChaiAiSdkProvider } from "~/types/server-config";

/** `createOpenAICompatible` from `@ai-sdk/openai-compatible`, typed structurally. */
export type CreateOpenAICompatible = (opts: { name: string; baseURL: string; apiKey?: string }) => ChaiAiSdkProvider;

export const OPENAI_COMPATIBLE_PLUGIN_ID = "openai-compatible";
export const OPENAI_COMPATIBLE_PLUGIN_LABEL = "OpenAI-compatible";
export const OPENAI_COMPATIBLE_PACKAGE = "@ai-sdk/openai-compatible";

/** The base URL is the only required setting — keyless local servers are valid. */
export function isOpenAICompatibleConfigured(): boolean {
  return Boolean(process.env.OPENAI_COMPATIBLE_BASE_URL);
}

/** Rebuild the provider when the endpoint, key, or label changes. */
export function openAICompatibleFingerprint(): string {
  return `${process.env.OPENAI_COMPATIBLE_BASE_URL ?? ""}|${process.env.OPENAI_COMPATIBLE_API_KEY ?? ""}|${
    process.env.OPENAI_COMPATIBLE_NAME ?? ""
  }`;
}

/**
 * Options `createOpenAICompatible` is called with, shared by the lazy plugin and
 * the statically-imported one so both behave identically.
 */
export function openAICompatibleOptions(): Parameters<CreateOpenAICompatible>[0] {
  return {
    name: process.env.OPENAI_COMPATIBLE_NAME || "openai-compatible",
    baseURL: process.env.OPENAI_COMPATIBLE_BASE_URL as string,
    ...(process.env.OPENAI_COMPATIBLE_API_KEY ? { apiKey: process.env.OPENAI_COMPATIBLE_API_KEY } : {}),
  };
}

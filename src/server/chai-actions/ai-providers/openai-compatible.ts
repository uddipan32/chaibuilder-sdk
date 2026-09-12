import { importOptionalPeer } from "~/lib/import-optional-peer";
import type { ChaiAiProviderPlugin, ChaiAiSdkProvider } from "~/types/server-config";
import {
  isOpenAICompatibleConfigured,
  openAICompatibleFingerprint,
  openAICompatibleOptions,
  OPENAI_COMPATIBLE_PACKAGE,
  OPENAI_COMPATIBLE_PLUGIN_ID,
  OPENAI_COMPATIBLE_PLUGIN_LABEL,
  type CreateOpenAICompatible,
} from "./openai-compatible-options";

/**
 * Built-in adapter for any OpenAI-compatible endpoint.
 *
 * A single plugin that covers the many providers exposing an OpenAI-style
 * `/v1` API — Hugging Face Inference Router, Groq, Together, Fireworks,
 * DeepInfra, Ollama, LM Studio, vLLM, and self-hosted gateways. Activated by
 * `OPENAI_COMPATIBLE_BASE_URL`; requires the optional peer dependency
 * `@ai-sdk/openai-compatible` (imported lazily, only when the base URL is set).
 *
 * Env vars:
 *  - `OPENAI_COMPATIBLE_BASE_URL` (required)   e.g. https://router.huggingface.co/v1
 *  - `OPENAI_COMPATIBLE_API_KEY`  (optional)   omitted for keyless local servers (Ollama)
 *  - `OPENAI_COMPATIBLE_NAME`     (optional)   provider label, defaults to "openai-compatible"
 *
 * Model ids are passed straight through, so use whatever the endpoint expects
 * (e.g. `meta-llama/Llama-3.3-70B-Instruct`, `llama3.1`).
 *
 * The lazy import is what keeps the package optional — and what hides it from
 * bundlers, so Next's output file tracing leaves it out of a production build
 * even when it is installed. Hosts that ship this provider should register
 * `chaicore/ai/openai-compatible` instead, which imports the SDK statically.
 */
export const openAICompatiblePlugin: ChaiAiProviderPlugin = {
  id: OPENAI_COMPATIBLE_PLUGIN_ID,
  label: OPENAI_COMPATIBLE_PLUGIN_LABEL,
  packageName: OPENAI_COMPATIBLE_PACKAGE,
  isConfigured: isOpenAICompatibleConfigured,
  fingerprint: openAICompatibleFingerprint,
  createProvider: async (): Promise<ChaiAiSdkProvider> => {
    const { createOpenAICompatible } = await importOptionalPeer<{
      createOpenAICompatible: CreateOpenAICompatible;
    }>(OPENAI_COMPATIBLE_PACKAGE);
    return createOpenAICompatible(openAICompatibleOptions());
  },
};

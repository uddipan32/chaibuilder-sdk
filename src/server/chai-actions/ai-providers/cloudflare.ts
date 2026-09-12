import { importOptionalPeer } from "~/lib/import-optional-peer";
import type { ChaiAiProviderPlugin, ChaiAiSdkProvider } from "~/types/server-config";

/** Workers AI is a *callable* provider (`workersai(id)`) that also exposes `.imageModel`. */
type WorkersAiProvider = {
  (modelId: string): unknown;
  imageModel: (modelId: string) => unknown;
};
type CreateWorkersAI = (opts: { accountId: string; apiKey: string }) => WorkersAiProvider;

/**
 * Built-in Cloudflare Workers AI adapter (REST mode).
 *
 * Activated when both `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` are set;
 * requires the optional peer dependency `workers-ai-provider` (imported lazily,
 * only when the credentials are present).
 *
 * This uses the REST transport so it works in any Node/serverless runtime. Inside
 * a Cloudflare Worker you would instead bind `env.AI` directly — do that with the
 * `ai.provider` config escape hatch:
 *   `ai: { provider: () => createWorkersAI({ binding: env.AI }) }`
 *
 * Workers AI uses `@cf/...` model ids (e.g. `@cf/meta/llama-3.1-8b-instruct`), so
 * configure Cloudflare model ids in `ai.models` / per action rather than the
 * gateway's `provider/model` slugs.
 */
export const cloudflarePlugin: ChaiAiProviderPlugin = {
  id: "cloudflare",
  label: "Cloudflare Workers AI",
  packageName: "workers-ai-provider",
  isConfigured: () => Boolean(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN),
  fingerprint: () => `${process.env.CLOUDFLARE_ACCOUNT_ID ?? ""}|${process.env.CLOUDFLARE_API_TOKEN ?? ""}`,
  createProvider: async (): Promise<ChaiAiSdkProvider> => {
    const { createWorkersAI } = await importOptionalPeer<{ createWorkersAI: CreateWorkersAI }>("workers-ai-provider");
    // Workers AI returns a *callable* provider — `workersai(id)` builds a language
    // model, `workersai.imageModel(id)` an image model — but it has no
    // `.languageModel` method, which the AI SDK's default-provider path calls for
    // bare-string models. Adapt it to the ChaiAiSdkProvider shape.
    const workersai = createWorkersAI({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID as string,
      apiKey: process.env.CLOUDFLARE_API_TOKEN as string,
    });
    return {
      languageModel: (modelId: string) => workersai(modelId),
      imageModel: (modelId: string) => workersai.imageModel(modelId),
    };
  },
};

import type { ImageModel, LanguageModel } from "ai";
import type { AIModel } from "~/builder/pages/panels/ai-panel/ai-models-context";
import type { ResolvedChaiAIGlobalConfig } from "~/types/server-config";

export type { LogAiRequestParams, ResolvedChaiAIGlobalConfig } from "~/types/server-config";

/** Partial AI config for input; use ResolvedChaiAIGlobalConfig after buildChaiBuilderConfig. */
export type ChaiAIGlobalConfig = Partial<ResolvedChaiAIGlobalConfig> & {
  models?: AIModel[];
  resolveModel?: (
    modelKey: string,
    aiActionName: string,
  ) => { model: LanguageModel | ImageModel; providerOptions?: Record<string, unknown> } | undefined;
};

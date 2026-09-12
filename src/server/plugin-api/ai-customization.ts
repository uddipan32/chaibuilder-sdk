import type { ToolSet } from "ai";

/**
 * Seam between the core AI actions and root-app customization. Every AI action
 * builds its own system prompt (and, for tool-driven actions, its own tool set)
 * inside `execute()`; before it hands them to the model it runs them through
 * whatever customizers are registered here. This lets a root app tailor the
 * built-in prompts to its use case and contribute extra AI-SDK tools, keyed off
 * the action it is looking at.
 *
 * An AI plugin registers into this globalThis-backed registry from a setup hook
 * (same pattern as `registerChaiCreditProvider`). The registry itself is internal.
 *
 * Customizations are keyed by name in a Map (like `registerChaiRequestMiddleware`)
 * so repeated registration — Next.js builds a module graph per route, and an app
 * may call `buildChaiBuilderConfig()` more than once — REPLACES the entry rather
 * than stacking duplicate transformations. The Map preserves insertion order, so
 * distinct names still compose: prompts chain and tool maps merge in that order.
 */

/** Context passed to customizers so the app can branch per AI action. */
export type ChaiAiActionInfo = {
  /** Registry action key, e.g. "AI_EDIT_PAGE". */
  action: string;
  /** Finer-grained sub-context, e.g. "block" / "page" / "TRANSLATE_CONTENT". */
  initiator?: string;
  appId?: string;
  userId?: string;
  /** Raw action data, for the app to inspect when deciding an override. */
  data?: unknown;
};

/**
 * Transforms the built-in system prompt for an AI action. Receives the default
 * prompt and returns the one to use — return `defaultPrompt` unchanged to opt
 * out for a given action. Chained: each customizer sees the previous result.
 */
export type ChaiAiPromptCustomizer = (defaultPrompt: string, info: ChaiAiActionInfo) => string | Promise<string>;

/**
 * Contributes extra AI-SDK-compatible tools to an AI action. Return a
 * `tool({...})` map (from `ai`); returned maps are merged onto the action's
 * base tools (app keys win). Tools with an `execute()` run server-side in the
 * model's tool loop end-to-end; client-applied tools (no `execute()`) need
 * matching builder-side handling and are not wired for v1.
 */
export type ChaiAiToolsCustomizer = (info: ChaiAiActionInfo) => ToolSet | Promise<ToolSet>;

export type ChaiAiCustomization = {
  prompt?: ChaiAiPromptCustomizer;
  tools?: ChaiAiToolsCustomizer;
};

const _g = globalThis as typeof globalThis & { __chaiAiCustomizers?: Map<string, ChaiAiCustomization> };

function getRegistry(): Map<string, ChaiAiCustomization> {
  if (!_g.__chaiAiCustomizers) {
    _g.__chaiAiCustomizers = new Map();
  }
  return _g.__chaiAiCustomizers;
}

/**
 * Registers prompt and/or tool customizers under `name` (typically the owning
 * plugin's id). Re-registering the same name REPLACES the entry, so repeated
 * runtime registration doesn't multiply transformations; distinct names compose
 * in insertion order.
 */
export function registerChaiAiCustomization(name: string, customization: ChaiAiCustomization): void {
  getRegistry().set(name, customization);
}

/** Runs the registered prompt customizers in insertion order; returns `defaultPrompt` when none. */
export async function resolveChaiAiPrompt(defaultPrompt: string, info: ChaiAiActionInfo): Promise<string> {
  let prompt = defaultPrompt;
  for (const { prompt: customizer } of getRegistry().values()) {
    if (customizer) prompt = await customizer(prompt, info);
  }
  return prompt;
}

/** Merges every registered tools customizer's output into one map; `{}` when none. */
export async function resolveChaiAiTools(info: ChaiAiActionInfo): Promise<ToolSet> {
  let tools: ToolSet = {};
  for (const { tools: customizer } of getRegistry().values()) {
    if (!customizer) continue;
    const contributed = await customizer(info);
    if (contributed) tools = { ...tools, ...contributed };
  }
  return tools;
}

/** @internal Clears registered customizers between unit tests. */
export function resetChaiAiCustomizersForTests(): void {
  _g.__chaiAiCustomizers = undefined;
}

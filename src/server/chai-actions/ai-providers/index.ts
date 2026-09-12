/**
 * Pluggable AI provider architecture.
 *
 * ChaiBuilder resolves model ids (e.g. "anthropic/claude-sonnet-4") to plain
 * `provider/model` strings and hands them to the Vercel AI SDK. When a model is a
 * bare string the AI SDK routes it through `globalThis.AI_SDK_DEFAULT_PROVIDER` if
 * one is set, and otherwise through the built-in Vercel AI Gateway
 * (`AI_GATEWAY_API_KEY`).
 *
 * `ensureAiProvider()` decides which provider owns that global slot, in priority:
 *   0. A provider set directly on `globalThis.AI_SDK_DEFAULT_PROVIDER` by the host
 *      application always wins — ChaiBuilder never overwrites a slot it does not
 *      own, so hosts can take full control of routing.
 *   1. `ai.provider` from config — an explicit AI SDK provider instance/factory.
 *      Use this to plug in ANY provider (Cloudflare Workers AI, Hugging Face,
 *      Bedrock, a custom gateway, …) with zero built-in support.
 *   2. The first configured provider plugin — custom (`ai.providers`) then
 *      built-in (e.g. OpenRouter). Plugins auto-activate from env vars and lazily
 *      import their peer-dependency SDK package, so "install the package + set the
 *      key" is all a user needs.
 *   3. Nothing configured — the AI SDK falls back to its gateway, exactly as
 *      before. Behaviour is purely additive.
 *
 * A provider that is configured but cannot be built is an error, not a silent
 * downgrade: routing those requests through the gateway anyway would bill the
 * wrong account and surface the gateway's own unrelated errors in the builder.
 * The request fails instead, with a message naming the provider and the package
 * to install.
 *
 * Calls are serialized (see the mutex below) so that concurrent requests never
 * interleave the module-level bookkeeping across `await` points.
 */
import { AI_SETUP_ERROR_PREFIX } from "~/constants/AI_SETUP_ERROR";
import { getConfigAI } from "~/server/defaults/config-registry";
import type { ChaiAiProvider, ChaiAiProviderPlugin, ChaiAiSdkProvider } from "~/types/server-config";
import { ActionError } from "../action-error";
import { cloudflarePlugin } from "./cloudflare";
import { openAICompatiblePlugin } from "./openai-compatible";
import { openRouterPlugin } from "./openrouter";

const DEFAULT_PROVIDER_KEY = "AI_SDK_DEFAULT_PROVIDER";

/** Built-in provider adapters, tried in order after any app-supplied plugins. */
export const BUILTIN_AI_PROVIDER_PLUGINS: ChaiAiProviderPlugin[] = [
  openRouterPlugin,
  openAICompatiblePlugin,
  cloudflarePlugin,
];

// The `ai` package globally types AI_SDK_DEFAULT_PROVIDER as ProviderV3; treat the
// slot loosely so any structural AI SDK provider (ProviderV2/V3) can be installed.
const globalProviderSlot = globalThis as unknown as Record<string, unknown>;

/** The provider instance we installed, so we only ever touch our own. */
let installedProvider: unknown;
/** Identity of what the current attempt was built from (config value or plugin object). */
let attemptedSource: unknown;
/** Cache key (plugin fingerprint) so credential rotation triggers a rebuild. */
let attemptedFingerprint: string | undefined;
/** Why the current attempt failed, replayed to every request until the source changes. */
let attemptError: ActionError | undefined;

/**
 * True when the global slot holds a provider ChaiBuilder did not install — i.e.
 * the host application set it directly. We never overwrite that.
 */
function hostOwnsSlot(): boolean {
  const current = globalProviderSlot[DEFAULT_PROVIDER_KEY];
  return current !== undefined && current !== installedProvider;
}

/** True when `source` + credentials are what we already built from, or failed on. */
function isCurrentAttempt(source: unknown, fingerprint: string | undefined): boolean {
  if (attemptedSource !== source || attemptedFingerprint !== fingerprint) return false;
  return (
    attemptError !== undefined ||
    (installedProvider !== undefined && globalProviderSlot[DEFAULT_PROVIDER_KEY] === installedProvider)
  );
}

function installProvider(provider: unknown, source: unknown, fingerprint: string | undefined): void {
  globalProviderSlot[DEFAULT_PROVIDER_KEY] = provider;
  installedProvider = provider;
  attemptedSource = source;
  attemptedFingerprint = fingerprint;
  attemptError = undefined;
}

/** Drop our provider from the slot. Never clobbers one the host set directly. */
function uninstallProvider(): void {
  if (installedProvider === undefined) return;
  if (globalProviderSlot[DEFAULT_PROVIDER_KEY] === installedProvider) {
    delete globalProviderSlot[DEFAULT_PROVIDER_KEY];
  }
  installedProvider = undefined;
}

/** Nothing is configured any more — back to the AI SDK's own gateway. */
function forgetAttempt(): void {
  uninstallProvider();
  attemptedSource = undefined;
  attemptedFingerprint = undefined;
  attemptError = undefined;
}

/**
 * Record why an attempt failed. `message` is written for whoever is looking at the
 * builder, so it is logged once here (with the underlying cause, which is the part
 * worth reading in a server log) and then replayed to every AI request until the
 * config or the credentials change.
 */
function recordFailure(source: unknown, fingerprint: string | undefined, message: string, cause: unknown): void {
  uninstallProvider();
  attemptedSource = source;
  attemptedFingerprint = fingerprint;
  attemptError = new ActionError(`${AI_SETUP_ERROR_PREFIX}${message}`, "AI_PROVIDER_UNAVAILABLE", 500);
  console.error(`[chaibuilder] ${message}`, cause);
}

function throwIfAttemptFailed(): void {
  if (attemptError) throw attemptError;
}

function pluginFailureMessage(plugin: ChaiAiProviderPlugin): string {
  const install = plugin.packageName ? `Install \`${plugin.packageName}\`` : "Install its provider package";
  return (
    `The "${plugin.label ?? plugin.id}" AI provider is configured but could not be loaded. ` +
    `${install} to enable it, or remove its credentials to use the default AI gateway instead.`
  );
}

async function resolveProvider(provider: ChaiAiProvider): Promise<ChaiAiSdkProvider> {
  return typeof provider === "function" ? provider() : provider;
}

function safeIsConfigured(plugin: ChaiAiProviderPlugin): boolean {
  try {
    return plugin.isConfigured();
  } catch {
    return false;
  }
}

function safeFingerprint(plugin: ChaiAiProviderPlugin): string | undefined {
  try {
    return plugin.fingerprint?.();
  } catch {
    return undefined;
  }
}

/** All provider plugins in priority order: app-supplied first, built-ins last. */
function activePlugins(): ChaiAiProviderPlugin[] {
  const custom = getConfigAI().providers ?? [];
  return [...custom, ...BUILTIN_AI_PROVIDER_PLUGINS];
}

async function ensureAiProviderInner(): Promise<void> {
  // 0. A provider the host set directly on globalThis always wins.
  if (hostOwnsSlot()) return;

  const config = getConfigAI();

  // 1. Explicit provider from config wins.
  const configured = config.provider;
  if (configured) {
    if (!isCurrentAttempt(configured, undefined)) {
      try {
        installProvider(await resolveProvider(configured), configured, undefined);
      } catch (error) {
        recordFailure(
          configured,
          undefined,
          "The AI provider configured via `ai.provider` could not be initialised. " +
            "Fix it, or remove it to use the default AI gateway instead.",
          error,
        );
      }
    }
    throwIfAttemptFailed();
    return;
  }

  // 2. First configured provider plugin (custom, then built-in).
  const plugin = activePlugins().find(safeIsConfigured);
  if (plugin) {
    const fingerprint = safeFingerprint(plugin);
    if (!isCurrentAttempt(plugin, fingerprint)) {
      try {
        installProvider(await plugin.createProvider(), plugin, fingerprint);
      } catch (error) {
        recordFailure(plugin, fingerprint, pluginFailureMessage(plugin), error);
      }
    }
    throwIfAttemptFailed();
    return;
  }

  // 3. Nothing configured — use the AI SDK default gateway.
  forgetAttempt();
}

/** Serializes ensureAiProvider() calls so their state mutations never interleave. */
let queue: Promise<void> = Promise.resolve();

/**
 * Ensures the AI SDK default provider matches the current config + environment.
 * Idempotent and cheap, so it is safe to call before every AI request:
 *  - host owns the slot -> no-op (never overwritten)
 *  - source unchanged   -> no-op
 *  - source changed      -> (re)installs the resolved provider
 *  - nothing active      -> removes a previously installed provider (gateway default)
 *
 * Calls run one at a time. Rejects with an `AI_PROVIDER_UNAVAILABLE` ActionError
 * when a configured provider cannot be built, so the request fails with the real
 * reason rather than quietly going through the gateway. The build is attempted
 * once per source + credentials; the same error is replayed until either changes.
 */
export function ensureAiProvider(): Promise<void> {
  const run = queue.then(ensureAiProviderInner, ensureAiProviderInner);
  // Keep the chain alive even if a run rejects; callers still see their own result.
  queue = run.catch(() => {});
  return run;
}

/** Test-only: reset cached provider state between cases. */
export function resetAiProviderForTests(): void {
  forgetAttempt();
  queue = Promise.resolve();
}

/**
 * Well-known identifiers shared between AI flows and the pro credits UI. Any AI
 * action that spends credits invalidates the query key afterwards; that is inert
 * unless `plansClientPlugin` mounted the credits UI to observe it. Held here, in
 * core, so the AI side can signal "credits changed" without importing the
 * credits plugin.
 */
export const AI_CREDITS_QUERY_KEY = "AI_CREDITS";
export const AI_ADDON_CREDITS_PANEL_ID = "ai-addon-credits";

/**
 * Sentinel that replaces bulky `html` tool inputs in pruned model history.
 * Shared so the server prune and the client guard stay in lockstep — the
 * client must never render this string as if it were real block markup.
 */
export const AI_OMITTED_HTML_SENTINEL = "[html omitted — read the block again if needed]";

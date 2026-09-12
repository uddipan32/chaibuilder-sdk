import { filter, get } from "lodash-es";
import { ChaiBlock } from "~/types/common";

/**
 * A partial whose page was deleted answers with the PAGE_NOT_FOUND action code.
 * Anything else (network, auth, server fault) is a transient error worth retrying.
 *
 * Matching on the code alone is deliberate: a bare HTTP 404 carries no such code
 * (the fetch layer reports it as INTERNAL_ERROR), and a misrouted endpoint must
 * not be mistaken for a deleted partial.
 */
export const isMissingPartialError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return get(error, "code") === "PAGE_NOT_FOUND";
};

// Graph math shared with the server-side AI partial filtering
export { getPartialDepth, getPartialUsageDepth, wouldCreateCycle } from "~/utils/partial-nesting";

/**
 * A used partial reference (PartialBlock / GlobalBlock). Its outline label is the
 * referenced partial page's name, so these rows are NOT renameable.
 */
export const isPartialBlockType = (type: unknown): boolean => type === "PartialBlock" || type === "GlobalBlock";

/**
 * Helper to extract partial IDs from blocks. Hidden refs (_show=false) count
 * too: visibility is a display state, not a structural one — a hidden partial
 * can be unhidden at any time, so it must factor into nesting rules and the
 * denormalized partialBlocks column (matching the server-side
 * extractPartialBlockIds).
 */
export const extractPartialIds = (blocks: ChaiBlock[]): string[] => {
  return filter(
    blocks.map((b) => {
      if (b._type === "PartialBlock" || b._type === "GlobalBlock") {
        return get(b, "partialBlockId", get(b, "globalBlock", ""));
      }
      return null;
    }),
    Boolean,
  ) as string[];
};

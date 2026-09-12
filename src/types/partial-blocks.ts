import { ChaiBlock } from "~/types/common";

/**
 * Metadata jsonb key under which partial/global-block tags are stored. Namespaced
 * with a `__` prefix so it never collides with a user-defined `tags` metadata key.
 */
export const PARTIAL_TAGS_METADATA_KEY = "__tags";

/**
 * Unified state for a single partial block entry.
 *
 * `missing` is distinct from `error`: the referenced partial page was deleted
 * (server answers 404), so retrying will never help. The block stays in the page
 * JSON — the outline flags it so the user can remove it deliberately.
 */
export type PartialBlockEntry = {
  blocks: ChaiBlock[];
  dependencies: string[];
  status: "idle" | "loading" | "loaded" | "error" | "missing";
  error?: string;
};

/**
 * Type for the partial blocks list (used in add-blocks panel)
 */
export type PartialBlockList = Record<string, { name?: string; description?: string; type?: string; tags?: string[] }>;

/**
 * Result type for can-add-partial checks
 */
export type CanAddPartialResult = {
  canAdd: boolean;
  reason?: string;
};

import { isEmpty } from "lodash-es";
import { PARTIAL_TAGS_METADATA_KEY } from "~/types/partial-blocks";

/**
 * Normalize free-form partial/global-block tags before persisting:
 * trim, collapse internal whitespace, drop empties, and dedupe
 * case-insensitively while keeping the first-seen casing.
 */
export const normalizeTags = (tags?: string[]): string[] => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    if (typeof raw !== "string") continue;
    const cleaned = raw.trim().replace(/\s+/g, " ");
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
};

export { PARTIAL_TAGS_METADATA_KEY };

/**
 * Build the metadata jsonb object for a newly created page from the
 * partial-facing description and tags. Only non-empty keys are written.
 */
export const buildPartialMetadata = (description?: string, tags?: string[]): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {};
  if (!isEmpty(description)) metadata.description = description;
  const normalizedTags = normalizeTags(tags);
  if (normalizedTags.length > 0) metadata[PARTIAL_TAGS_METADATA_KEY] = normalizedTags;
  return metadata;
};

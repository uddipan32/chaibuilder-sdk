import type { ChaiBaseSlugEntry } from "~/types/chaibuilder-config";

/** Build public URL for a collection item, matching find-page-by-slug segment order. */
export function buildDynamicItemPath(
  base: Pick<ChaiBaseSlugEntry, "slug" | "dynamicSlugCustom">,
  itemSlug: string,
): string {
  const normalizedBase = base.slug.endsWith("/") ? base.slug.slice(0, -1) : base.slug;
  const normalizedItem = itemSlug.replace(/^\/+/, "");
  const custom = base.dynamicSlugCustom ?? "";
  return `${normalizedBase}/${normalizedItem}${custom}`;
}

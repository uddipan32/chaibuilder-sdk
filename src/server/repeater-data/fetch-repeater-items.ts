import { get } from "lodash-es";
import { COLLECTION_ITEM_TYPE } from "~/constants/BLOCK_TYPES";
import type { ChaiBlock } from "~/types/common";
import { buildRepeaterQuery } from "./build-repeater-query";
import { resolveRepeaterSource } from "./resolve-source";

export type FetchRepeaterItemsArgs = {
  block: ChaiBlock;
  pageProps: { slug?: string; [key: string]: any };
  lang: string;
  draft: boolean;
  inBuilder: boolean;
  /** Page external data — {{...}} filter-value bindings resolve against this. */
  externalData?: Record<string, any>;
};

/**
 * Single entry point both fetch pipelines (builder action and live render) use
 * to load a Repeater block's data from its `{{#<id>}}` source. Repeater-data
 * sources receive a validated structured query; legacy collections keep the old
 * fetch contract. Returns null for an unknown source id; fetch errors propagate
 * to the caller.
 */
export async function fetchRepeaterItems(
  args: FetchRepeaterItemsArgs,
): Promise<{ items: any[]; totalItems?: number; $cacheTags?: string[] } | null> {
  const { block, pageProps, lang, draft, inBuilder, externalData } = args;
  const sourceId = String(get(block, "repeaterItems", "")).replace("{{#", "").replace("}}", "");
  const resolved = resolveRepeaterSource(sourceId);
  if (!resolved) return null;

  // CollectionItem finds a single detailed item through the source's `fetchItem`.
  // Legacy collections and sources without `fetchItem` never serve this block —
  // the picker hides them, and this guard covers hand-edited pages.
  if (block._type === COLLECTION_ITEM_TYPE) {
    if (resolved.kind !== "repeaterData" || !resolved.source.fetchItem) return null;
    const query = buildRepeaterQuery(resolved.source, { ...block, limit: 1 }, { pageProps, lang, externalData });
    // A find with no usable filter is not a find: fetching would hand back the
    // source's first item and read as a successful match. That covers both an
    // unfiltered block and one whose only filter value resolved to nothing.
    if (query.filters.length === 0) return { items: [] };
    const result = await resolved.source.fetchItem({
      block,
      pageProps: pageProps as any,
      lang,
      draft,
      inBuilder,
      query,
    });
    return { items: result?.item ? [result.item] : [], $cacheTags: result?.$cacheTags };
  }

  if (resolved.kind === "repeaterData") {
    const query = buildRepeaterQuery(resolved.source, block, { pageProps, lang, externalData });
    const result = await resolved.source.fetch({
      block,
      pageProps: pageProps as any,
      lang,
      draft,
      inBuilder,
      query,
    });
    return { items: result?.items ?? [], totalItems: result?.totalItems, $cacheTags: result?.$cacheTags };
  }

  const result = await resolved.source.fetch({
    block,
    pageProps: pageProps as any,
    lang,
    draft,
    inBuilder,
  });
  // Legacy collections keep their exact fetch result — extra keys included —
  // because the builder action used to return it verbatim.
  return { ...result, items: result?.items ?? [], totalItems: result?.totalItems };
}

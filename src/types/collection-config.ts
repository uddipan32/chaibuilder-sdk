import type { ChaiBlock } from "~/types/common";

/** @deprecated Use `ChaiRepeaterDataFetchParams` from `~/types/repeater-data` instead. */
export type CollectionFetchParams = {
  block: ChaiBlock;
  inBuilder: boolean;
  draft: boolean;
  lang: string;
  pageProps: {
    slug: string;
    params?: Record<string, string>;
    [key: string]: any;
  };
};

/** @deprecated Use `ChaiRepeaterDataConfig` from `~/types/repeater-data` instead — declarative fields with typed filters, sorting and limit. */
export interface CollectionConfig<T> {
  id: string;
  name: string;
  icon?: string;
  filters?: { id: string; name: string }[];
  sort?: { id: string; name: string }[];
  fetch: (params: CollectionFetchParams) => Promise<{ items: T[]; totalItems?: number }>;
}

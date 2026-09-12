type FilterOptions = {
  id: string;
  name: string;
  description?: string;
};

type SortOptions = {
  id: string;
  name: string;
  description?: string;
};

/**
 * @deprecated Use `ChaiRepeaterDataDefinition` from `~/types/repeater-data` instead.
 * Note: the `sorts` key here never matched the server-side `CollectionConfig.sort`
 * key, so the legacy Sort dropdown never populated.
 */
export type ChaiCollectoin = {
  id: string;
  name: string;
  description?: string;
  filters?: FilterOptions[];
  sorts?: SortOptions[];
};

/**
 * Correctly spelled alias of {@link ChaiCollectoin}.
 * @deprecated Use `ChaiRepeaterDataDefinition` from `~/types/repeater-data` instead.
 */
export type ChaiCollection = ChaiCollectoin;

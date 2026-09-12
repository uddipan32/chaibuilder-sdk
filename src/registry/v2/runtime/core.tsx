import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import {
  cloneDeep,
  each,
  get,
  has,
  isArray,
  isEmpty,
  isPlainObject,
  isString,
  keys,
  memoize,
  omitBy,
  set,
  startCase,
} from "lodash-es";
import React, { useMemo } from "react";
import { STYLES_KEY } from "~/constants/STRINGS";
import type { ChaiBlockConfig, ChaiBlockStyleVariant } from "~/types/blocks";
import { ChaiBlockComponentProps } from "~/types/blocks";
import { ChaiBlock, ChaiBlockPropsSchema, ChaiPageProps } from "~/types/common";

const REGISTERED_CHAI_BLOCKS: Record<
  string,
  ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> }
> = {};

export const useRegisteredChaiBlocks = () => {
  return REGISTERED_CHAI_BLOCKS;
};

/** Returns all registered ChaiBlock configs. Safe to call outside React. */
export const getAllRegisteredChaiBlocks = (): Record<
  string,
  ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> }
> => {
  return REGISTERED_CHAI_BLOCKS;
};

export const useRegisteredChaiBlock = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return useMemo(() => get(REGISTERED_CHAI_BLOCKS, type, null), [type]);
};

export const getRegisteredChaiBlock = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
):
  | (ChaiBlockConfig & {
      component: React.ComponentType<ChaiBlockComponentProps>;
    })
  | undefined => {
  return get(REGISTERED_CHAI_BLOCKS, type) as ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> };
};

type RegisteredBlock = ChaiBlockConfig & { component: React.ComponentType<ChaiBlockComponentProps> };

/**
 * A style variant is a plain object of style-prop names to class strings. React
 * components are excluded by the `$$typeof` check — `React.memo`/`forwardRef`
 * results are plain objects as far as lodash is concerned.
 */
const isStyleVariant = (variant: unknown): variant is ChaiBlockStyleVariant =>
  isPlainObject(variant) && !has(variant, "$$typeof");

const getBlockVariant = (registeredBlock: RegisteredBlock | null | undefined, variant?: string) =>
  registeredBlock && variant ? get(registeredBlock, ["variants", variant]) : undefined;

/**
 * Resolves the component to render for a block instance. A block may register
 * named `variants` alongside its default component; `block._variant` picks one.
 * An absent, empty, unknown or style-only variant name falls back to the default
 * component, so a variant that was renamed or unregistered never breaks a saved page.
 */
export const resolveChaiBlockComponent = (
  registeredBlock: RegisteredBlock | null | undefined,
  variant?: string,
): React.ComponentType<ChaiBlockComponentProps> | null => {
  if (!registeredBlock) return null;
  const variantValue = getBlockVariant(registeredBlock, variant);
  const variantComponent = isStyleVariant(variantValue) ? undefined : variantValue;
  return (variantComponent as React.ComponentType<ChaiBlockComponentProps>) ?? get(registeredBlock, "component", null);
};

const toChaiStylesValue = (classes: string) =>
  // An author may pass a full "#styles:base,classes" string to control both
  // segments; a bare class list becomes the user-facing (winning) segment.
  classes.startsWith(STYLES_KEY) ? classes : `${STYLES_KEY},${classes}`;

/**
 * Style props written into the block when `variant` is selected in the builder.
 * Style variants are applied at edit time, not at render time — the classes land
 * in the block's own style props, so the saved page needs no variant lookup and
 * the style panel keeps working on the result.
 *
 * The keys returned are the union of every style prop any style variant of this
 * block controls, so switching between variants (or back to Default) always
 * resets props the newly selected variant does not set back to their schema
 * default, instead of leaving the previous variant's classes behind.
 *
 * Returns undefined when the block has no style variants at all.
 */
export const getChaiBlockStyleVariantProps = (
  registeredBlock: RegisteredBlock | null | undefined,
  variant?: string,
): Record<string, string> | undefined => {
  const variants = get(registeredBlock, "variants", {}) as Record<string, unknown>;
  const controlledProps = new Set<string>();
  each(variants, (value) => {
    if (isStyleVariant(value)) each(keys(value), (styleProp) => controlledProps.add(styleProp));
  });
  if (controlledProps.size === 0) return undefined;

  const selected = getBlockVariant(registeredBlock, variant);
  const selectedStyles = (isStyleVariant(selected) ? selected : {}) as Record<string, unknown>;
  const defaults = getBlockDefaultProps(registeredBlock!.type);

  const styleProps: Record<string, string> = {};
  controlledProps.forEach((styleProp) => {
    const classes = selectedStyles[styleProp];
    styleProps[styleProp] = isString(classes)
      ? toChaiStylesValue(classes)
      : (get(defaults, styleProp, `${STYLES_KEY},`) as string);
  });
  return styleProps;
};

// REGISTERED_CHAI_BLOCKS is mutated after module load (late registration,
// re-registration, HMR), so plain memoize(type) can cache stale results.
// This skips caching while the type is unregistered, and registry mutations
// call invalidateBlockMemoCaches(type) to evict entries for updated types.
type MemoizedByRegisteredType<T> = ((type: keyof typeof REGISTERED_CHAI_BLOCKS) => T) & {
  cache: { delete: (key: string) => boolean };
};

const memoizeByRegisteredType = <T,>(
  getter: (type: keyof typeof REGISTERED_CHAI_BLOCKS) => T,
): MemoizedByRegisteredType<T> => {
  const memoized = memoize(getter);
  const wrapped = ((type: keyof typeof REGISTERED_CHAI_BLOCKS): T =>
    has(REGISTERED_CHAI_BLOCKS, type) ? memoized(type) : getter(type)) as MemoizedByRegisteredType<T>;
  wrapped.cache = memoized.cache;
  return wrapped;
};

export const getBlockDefaultProps = memoizeByRegisteredType((type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  const registeredBlock = get(REGISTERED_CHAI_BLOCKS, type);
  const schema = registeredBlock?.props?.schema ?? {};
  const properties = get(schema, "properties", {});
  const defaultProps: Record<string, any> = {};
  each(properties, (propSchema: ChaiBlockPropsSchema, key) => {
    if (has(propSchema, "block")) {
      return;
    }
    set(defaultProps, key, (propSchema as any).default);
  });
  return defaultProps;
});

export const getBlockI18nProps = memoizeByRegisteredType((type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return get(REGISTERED_CHAI_BLOCKS, `${type}.i18nProps`, []);
});

export const getBlockAIProps = memoizeByRegisteredType((type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  return get(REGISTERED_CHAI_BLOCKS, `${type}.aiProps`, []);
});

const getMemoizedBlockFormSchemas = memoizeByRegisteredType(
  (type: keyof typeof REGISTERED_CHAI_BLOCKS): { schema: RJSFSchema; uiSchema: UiSchema } | undefined => {
    const registeredBlock = getRegisteredChaiBlock(type);
    if (!registeredBlock) {
      return undefined;
    }
    const blockSchema = registeredBlock.props?.schema ?? {};
    const blockUiSchema = registeredBlock.props?.uiSchema ?? {};
    const schema = cloneDeep(blockSchema) as RJSFSchema;
    const properties = get(schema, "properties", {}) as Record<string, any>;
    const nonStylesProperties = omitBy(properties, (prop) => prop?.styles === true);
    const uiSchema = cloneDeep(blockUiSchema || {});
    const variantNames = keys(get(registeredBlock, "variants", {}));

    if (isEmpty(variantNames)) {
      set(schema, "properties", nonStylesProperties);
      return { schema, uiSchema };
    }

    // Variant select is derived from the registration, never declared by the
    // block author, so it is injected here rather than in the props schema.
    set(schema, "properties", {
      _variant: {
        type: "string",
        title: "Variant",
        default: "",
        oneOf: [
          { const: "", title: "Default" },
          ...variantNames.map((name) => ({ const: name, title: startCase(name) })),
        ],
      },
      ...nonStylesProperties,
    });
    // RJSF errors on properties missing from an explicit ui:order.
    if (isArray(get(uiSchema, "ui:order"))) {
      set(uiSchema, "ui:order", ["_variant", ...(get(uiSchema, "ui:order") as string[])]);
    }
    return { schema, uiSchema };
  },
);

export const getBlockFormSchemas = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
): { schema: RJSFSchema; uiSchema: UiSchema } | undefined => {
  const cachedSchemas = getMemoizedBlockFormSchemas(type);
  if (!cachedSchemas) {
    return undefined;
  }
  // Return clones so callers can safely mutate without corrupting the cache.
  return {
    schema: cloneDeep(cachedSchemas.schema),
    uiSchema: cloneDeep(cachedSchemas.uiSchema),
  };
};

const MEMOIZED_BLOCK_GETTERS = [getBlockDefaultProps, getBlockI18nProps, getBlockAIProps, getMemoizedBlockFormSchemas];

const invalidateBlockMemoCaches = (type: keyof typeof REGISTERED_CHAI_BLOCKS) => {
  for (const getter of MEMOIZED_BLOCK_GETTERS) {
    getter.cache.delete(type);
  }
};

export const syncBlocksWithDefaultProps = (blocks: ChaiBlock[]): ChaiBlock[] => {
  return blocks.map((block) => {
    if (has(REGISTERED_CHAI_BLOCKS, block._type)) {
      const defaults = getBlockDefaultProps(block._type);
      return { ...defaults, ...block } as ChaiBlock;
    }
    return block;
  });
};

const registerInternalBlock = (component: React.ComponentType<ChaiBlockComponentProps>, options: ChaiBlockConfig) => {
  const existingBlock = get(REGISTERED_CHAI_BLOCKS, options.type);
  if (existingBlock) {
    set(REGISTERED_CHAI_BLOCKS, options.type, {
      ...existingBlock,
      component,
      ...options,
    });
  } else {
    set(REGISTERED_CHAI_BLOCKS, options.type, { component, ...options });
  }
  invalidateBlockMemoCaches(options.type);
};

export const registerChaiBlock = (
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
  options: ChaiBlockConfig,
) => {
  registerInternalBlock(component, {
    ...options,
    ...{ category: options.category || "core" },
  });
};

export const registerChaiServerBlock = (
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
  options: Pick<ChaiBlockConfig, "type" | "dataProvider" | "i18nProps" | "aiProps">,
) => {
  const existingBlock = get(REGISTERED_CHAI_BLOCKS, options.type);
  if (existingBlock) {
    set(REGISTERED_CHAI_BLOCKS, options.type, {
      ...existingBlock,
      component,
      ...options,
    });
  } else {
    set(REGISTERED_CHAI_BLOCKS, options.type, { component, ...options });
  }
  invalidateBlockMemoCaches(options.type);
};

/** @internal Applies a data provider to the in-memory block registry. */
export const applyBlockDataProviderToRegistry = <K extends Record<string, any> = Record<string, any>>(
  type: keyof typeof REGISTERED_CHAI_BLOCKS | string,
  dataProvider: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    block: ChaiBlock<K>;
    pageProps: ChaiPageProps;
  }) => Promise<K>,
) => {
  const registeredBlock = getRegisteredChaiBlock(type);
  set(REGISTERED_CHAI_BLOCKS, type, {
    ...registeredBlock,
    type: registeredBlock?.type ?? type,
    dataProvider,
  });
  invalidateBlockMemoCaches(type);
};

export const setChaiBlockComponent = (
  type: keyof typeof REGISTERED_CHAI_BLOCKS,
  component: React.ComponentType<ChaiBlockComponentProps<any>>,
) => {
  const registeredBlock = getRegisteredChaiBlock(type);
  set(REGISTERED_CHAI_BLOCKS, type, { ...registeredBlock, component });
  invalidateBlockMemoCaches(type);
};

export const closestBlockProp = (
  blockType: keyof typeof REGISTERED_CHAI_BLOCKS,
  prop: string,
): ChaiBlockPropsSchema => {
  return {
    type: "null",
    block: blockType,
    prop,
    default: null,
    runtime: true,
    ui: { "ui:widget": "hidden" },
  };
};

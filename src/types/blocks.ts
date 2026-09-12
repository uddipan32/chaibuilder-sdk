import React from "react";
import { ChaiBlock, ChaiBlockSchema, ChaiBlockUiSchema, ChaiPageProps } from "./common";
import type { ChaiDesignTokens } from "./types";

export type ChaiBlockComponentProps<
  BlockProps = unknown,
  PageData = Record<string, unknown>,
> = ChaiBlock<BlockProps> & {
  // Chai Block Props
  $loading?: boolean;
  blockProps: Record<string, string>;
  inBuilder: boolean;
  lang: string;
  draft: boolean;
  pageProps?: ChaiPageProps;
  pageData?: PageData;
  /** Site design tokens, resolved with `resolveDesignToken` (works in RSC). */
  designTokens?: ChaiDesignTokens;
  //React Node
  children?: React.ReactNode;
};

export type ChaiStyles = {
  [key: string]: string;
};

/**
 * A registered block variant: either a replacement component, or a map of this
 * block's style prop names to class strings applied to the default component.
 */
export type ChaiBlockStyleVariant = Record<string, string>;
export type ChaiBlockVariant = React.ComponentType<ChaiBlockComponentProps<any>> | ChaiBlockStyleVariant;

export type ChaiAsyncProp<T> = T | undefined;
export type ChaiClosestBlockProp<T> = T | undefined;
export type ChaiDataProviderArgs<T = Record<string, any>, K = Record<string, any>> = {
  block: ChaiBlock<T>;
} & K;

/**
 * Result of a block data provider. May include `$cacheTags`: cache tags
 * registered on the consuming route during live render, so external data
 * changes can invalidate the pages that used the data via `revalidateTag`.
 * The key is always stripped before the result reaches the block, and never
 * registered in the builder or in draft mode. Tags must be tenant-scoped
 * (include the app/company id).
 */
export type ChaiDataProviderResult = Record<string, unknown> & {
  $cacheTags?: string[];
};

export interface ChaiBlockConfig {
  // required
  type: string;
  label: string;
  group: string;

  // optional
  description?: string;
  wrapper?: boolean;
  blocks?: ChaiBlock[] | (() => ChaiBlock[]);
  category?: string;
  hidden?: boolean | ((parentType?: string) => boolean);
  icon?: React.ReactNode | React.ComponentType;
  /**
   * Restricts this block to specific page types (matched against `ChaiPage.pageType`).
   * Omit to make the block available on every page type.
   */
  pageTypes?: string[];

  dataProviderMode?: "live" | "mock";
  dataProviderDependencies?: string[];
  dataProvider?: (args: {
    lang: string;
    draft: boolean;
    inBuilder: boolean;
    block: ChaiBlock;
    pageProps: ChaiPageProps;
  }) => ChaiDataProviderResult | Promise<ChaiDataProviderResult>;

  //props
  props?: {
    schema: ChaiBlockSchema;
    uiSchema: ChaiBlockUiSchema;
  };

  /**
   * Named visual variants of this block, chosen per block instance via the
   * reserved `_variant` key, which the editor exposes as a "Variant" dropdown.
   * A variant is either:
   *
   * - a **component variant** — a different component receiving the exact same
   *   props as the default one. Pass lazy wrappers,
   *   `next/dynamic(() => import("./variant"))`, so variants that are never
   *   rendered cost nothing; a static import makes the variant eager.
   * - a **style variant** — a plain object mapping this block's style prop names
   *   to class strings, e.g. `{ styles: "border p-6", activeItemStyle: "bg-black" }`.
   *   The default component still renders; only those style props are replaced.
   *
   * Re-registering a type without this key keeps previously registered variants;
   * pass an empty object to clear them.
   */
  variants?: Record<string, ChaiBlockVariant>;

  i18nProps?: string[];
  aiProps?: string[];
  inlineEditProps?: string[];

  /**
   * Props this block stops rendering once it has child blocks — a Heading with a
   * Span inside it renders the children and drops `content`. The settings panel
   * hides them for such an instance so the form only offers props that still
   * have an effect. Stored values are left untouched, so removing the children
   * brings the prop (and its value) back.
   */
  childrenOverrideProps?: string[];

  // callbacks
  canAcceptBlock?: (type: string) => boolean;
  canDelete?: () => boolean;
  canMove?: () => boolean;
  canDuplicate?: () => boolean;
  canBeNested?: (type: string) => boolean;
}

export interface ChaiServerBlockConfig {
  component: React.ComponentType<ChaiBlockComponentProps>;
  type: string;
  dataProvider?: (args: {
    draft: boolean;
    inBuilder: boolean;
    lang: string;
    block: ChaiBlock;
    pageProps: ChaiPageProps;
  }) => Promise<ChaiDataProviderResult>;
  suspenseFallback?: React.ComponentType<any>;
}

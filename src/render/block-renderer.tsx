import { get, has, isArray, isFunction, isNull } from "lodash-es";
import { createElement, Suspense } from "react";
import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "~/builder/core/components/canvas/static/new-blocks-render-helpers";
import { getRegisteredChaiBlock, resolveChaiBlockComponent } from "~/registry";
import { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlock, ChaiPageProps } from "~/types/common";
import { applyBindingToBlockProps } from "./apply-binding";
import DataProviderPropsBlock from "./async-props-block";
import { resolveBindingVisibility } from "./binding-engine";
import { CORE_SDK_BLOCKS } from "./core-sdk-blocks";
import { shouldInlineDataProviders } from "./inline-data-providers";
import { getRuntimePropValues, RenderChaiBlocksProps } from "./render-chai-blocks-sdk";

const SuspenseFallback = () => <div></div>;

export const RenderBlock = async (
  props: RenderChaiBlocksProps & {
    repeaterData?: { index: number; dataKey: string };
    collectionItemData?: { itemKey: string };
    block: ChaiBlock;
    children: ({
      _id,
      _type,
      repeaterItems,
      $repeaterItemsKey,
    }: {
      _id: string;
      _type: string;
      repeaterItems?: any;
      $repeaterItemsKey?: string;
      partialBlockId?: string;
    }) => React.ReactNode;
  },
) => {
  const {
    block,
    lang,
    fallbackLang,
    children,
    externalData,
    designTokens,
    blocks,
    draft,
    pageProps,
    blockErrorBoundary,
  } = props;
  const registeredChaiBlock = getRegisteredChaiBlock(block._type) as ChaiBlockConfig;
  const Component = resolveChaiBlockComponent(registeredChaiBlock as any, block._variant);
  const index = get(props.repeaterData, "index", -1);
  const dataKey = get(props.repeaterData, "dataKey", "");
  const itemKey = get(props.collectionItemData, "itemKey", "");

  const bindingLangSuffix = lang === fallbackLang ? "" : (lang ?? "");
  const bindingLocale = lang || fallbackLang || "en";
  const blockWithBinding: ChaiBlock = applyBindingToBlockProps(
    applyLanguage(block, bindingLangSuffix, registeredChaiBlock),
    externalData ?? {},
    { index, key: dataKey, locale: bindingLocale, itemKey },
  );
  const blockAttributesProps = getBlockTagAttributes(block, false);
  const runtimeProps = getRuntimePropValues(blocks, block._id, getBlockRuntimeProps(block._type));
  const hasDataProvider = has(registeredChaiBlock, "dataProvider") && isFunction(registeredChaiBlock.dataProvider);

  const newBlock: ChaiBlock = {
    ...blockWithBinding,
    ...blockAttributesProps,
    ...runtimeProps,
  };

  const blockProps = {
    blockProps: {},
    inBuilder: false,
    lang: lang || fallbackLang || "en",
    draft: draft ?? false,
    pageData: externalData ?? {},
    designTokens,
    pageProps: pageProps as ChaiPageProps,
    ...newBlock,
  };
  const isShown = resolveBindingVisibility(get(newBlock, "_show", true), externalData ?? {}, {
    index,
    repeaterKey: dataKey,
    itemKey,
    locale: bindingLocale,
  });
  if (isNull(Component) || !isShown) return null;

  // Wrap app "custom" blocks in the injected error boundary so a throwing block
  // degrades to nothing rather than crashing the whole page. Core/structural
  // SDK blocks stay unwrapped (they hold children, rarely throw). No-op when the
  // app didn't inject a boundary.
  const isCustomBlock = !CORE_SDK_BLOCKS.includes(block._type);
  const wrap = (element: React.ReactNode): React.ReactNode =>
    blockErrorBoundary && isCustomBlock
      ? createElement(blockErrorBoundary, { blockName: block._type, children: element })
      : element;

  const withDataProviderProps = (dataProviderProps: Record<string, any>) =>
    createElement(
      Component,
      {
        ...blockProps,
        ...dataProviderProps,
      },
      children({
        _id: block._id,
        _type: block._type,
        ...(isArray(blockWithBinding.repeaterItems)
          ? {
              repeaterItems: applyLimit(blockWithBinding.repeaterItems, block),
              $repeaterItemsKey: blockWithBinding.$repeaterItemsKey,
              repeaterTotalItems: blockWithBinding.repeaterTotalItems ?? -1,
            }
          : {}),
      }),
    );

  if (hasDataProvider) {
    const suspenseFallback = get(registeredChaiBlock, "suspenseFallback", SuspenseFallback) as React.ComponentType<any>;
    // Prefer a precomputed (e.g. batched) promise for this block when provided,
    // otherwise fall back to invoking the registered per-block dataProvider.
    const precomputed = props.dataProviders ? props.dataProviders[block._id] : undefined;
    const dataProvider = precomputed ? () => precomputed : registeredChaiBlock.dataProvider!;

    // Default path: await the (already in-flight) provider here so this
    // component resolves before React renders it. Nothing suspends, so the
    // markup lands in the document shell instead of a `<div hidden id="S:n">`
    // that only becomes visible once React's `$RC` runs — which never happens
    // with JavaScript disabled. Streaming is still reachable via
    // `CHAI_DISABLE_INLINE_DATA_PROVIDERS`; see `shouldInlineDataProviders`.
    //
    // `DataProviderPropsBlock` is called directly rather than rendered as
    // an element: it is a plain async function, so awaiting it reuses its
    // `consumeProviderTags` cache-tag registration and `LOG_PAGE_BUILD_TIMINGS`
    // instrumentation while guaranteeing nothing suspends. Rendering it
    // unwrapped would instead bubble to whatever `<Suspense>` happens to be
    // above us, which would silently put the content back in a hidden container.
    if (shouldInlineDataProviders()) {
      try {
        return wrap(
          await DataProviderPropsBlock({
            lang: lang ?? "",
            pageProps: pageProps as ChaiPageProps,
            block: newBlock,
            dataProvider,
            draft: draft ?? false,
            children: withDataProviderProps,
          }),
        );
      } catch (error) {
        // Inline mode awaits the provider *before* `wrap` builds the injected
        // error boundary, so a provider (or `consumeProviderTags`) rejection
        // throws here and would escape that boundary and crash the whole page
        // render — unlike the streaming path below, where the boundary wraps
        // the still-pending `<DataProviderPropsBlock>` element and catches it.
        // Restore that per-block isolation: boundary-wrapped custom blocks
        // degrade to nothing (the injected boundary renders `null`), while
        // core/structural blocks keep propagating exactly as they do unwrapped.
        if (blockErrorBoundary && isCustomBlock) {
          // Log before swallowing: this catch bypasses the injected boundary's
          // own `onError` (PostHog capture / red alert), so without this the
          // failure would be invisible in production. Server-side only — the
          // inline error never reaches a client boundary because nothing
          // streams. `console.error` matches this render path's convention.
          console.error(
            `[chai-render] data provider for block "${block._type}" (${block._id}) failed; degrading block to null`,
            { slug: pageProps?.slug, error },
          );
          return null;
        }
        throw error;
      }
    }

    return wrap(
      <Suspense fallback={createElement(suspenseFallback)}>
        <DataProviderPropsBlock
          lang={lang ?? ""}
          pageProps={pageProps as ChaiPageProps}
          block={newBlock}
          dataProvider={dataProvider}
          draft={draft ?? false}>
          {withDataProviderProps}
        </DataProviderPropsBlock>
      </Suspense>,
    );
  }

  const rendered = createElement(
    Component,
    { ...blockProps },
    children({
      _id: block._id,
      _type: block._type,
      ...(isArray(blockWithBinding.repeaterItems)
        ? {
            repeaterItems: applyLimit(blockWithBinding.repeaterItems, block),
            $repeaterItemsKey: blockWithBinding.$repeaterItemsKey,
            repeaterTotalItems: blockWithBinding.repeaterTotalItems ?? -1,
          }
        : {}),
    }),
  );

  // In inline mode there must be no boundary between the page root and any
  // descendant data-provider block: a `<Suspense>` here (even bare, with a
  // null fallback) would catch a child block that is still awaiting its
  // provider and stream it into a hidden `<div hidden id="S:n">` container —
  // exactly what inline mode exists to prevent.
  if (shouldInlineDataProviders()) {
    return wrap(rendered);
  }

  return wrap(<Suspense>{rendered}</Suspense>);
};

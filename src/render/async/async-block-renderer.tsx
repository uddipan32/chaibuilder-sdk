import { get, has, isArray, isFunction, isNull } from "lodash-es";
import { createElement, Suspense } from "react";
import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "~/builder/core/components/canvas/static/new-blocks-render-helpers";
import { getRegisteredChaiBlock, resolveChaiBlockComponent } from "~/registry";
import { applyBindingToBlockProps } from "~/render/apply-binding";
import { resolveBindingVisibility } from "~/render/binding-engine";
import { getRuntimePropValues, RenderChaiBlocksProps } from "~/render/render-chai-blocks-sdk";
import { ChaiBlockConfig } from "~/types/blocks";
import { ChaiBlock } from "~/types/common";
import AsyncDataProviderPropsBlock from "./async-props-block";

const SuspenseFallback = () => <div></div>;

export const AsyncRenderBlock = async (
  props: RenderChaiBlocksProps & {
    dataProviders: Record<string, Promise<Record<string, any>>>;
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
    blocks,
    draft,
    pageProps,
    dataProviders,
  } = props;
  const registeredChaiBlock = getRegisteredChaiBlock(block._type) as ChaiBlockConfig;
  const Component = resolveChaiBlockComponent(registeredChaiBlock as any, block._variant);
  const index = get(props.repeaterData, "index", -1);
  const dataKey = get(props.repeaterData, "dataKey", "");
  const itemKey = get(props.collectionItemData, "itemKey", "");

  const bindingLangSuffix = lang === fallbackLang ? "" : (lang ?? "en");
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
    pageProps,
    ...newBlock,
  };
  const isShown = resolveBindingVisibility(get(newBlock, "_show", true), externalData ?? {}, {
    index,
    repeaterKey: dataKey,
    itemKey,
    locale: bindingLocale,
  });
  if (isNull(Component) || !isShown) return null;

  if (hasDataProvider) {
    const dataProviderPromise = get(dataProviders, block._id, Promise.resolve({}));
    const suspenseFallback = get(registeredChaiBlock, "suspenseFallback", SuspenseFallback) as React.ComponentType<any>;
    return (
      <Suspense fallback={createElement(suspenseFallback)}>
        <AsyncDataProviderPropsBlock
          lang={lang ?? ""}
          pageProps={pageProps!}
          block={newBlock}
          dataProvider={dataProviderPromise}
          draft={draft ?? false}>
          {(dataProviderProps) => {
            return createElement(
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
          }}
        </AsyncDataProviderPropsBlock>
      </Suspense>
    );
  }

  return createElement(
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
};

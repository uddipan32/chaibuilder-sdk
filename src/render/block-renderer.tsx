import {
  applyLanguage,
  applyLimit,
  getBlockRuntimeProps,
  getBlockTagAttributes,
} from "@/core/components/canvas/static/new-blocks-render-helpers";
import { getRegisteredChaiBlock } from "@/runtime";
import { ChaiBlock } from "@/types/chai-block";
import { get, has, isArray, isFunction, isNull } from "lodash-es";
import { createElement, Suspense } from "react";
import { applyBindingToBlockProps } from "./apply-binding";
import DataProviderPropsBlock from "./async-props-block";
import { getRuntimePropValues, RenderChaiBlocksProps } from "./render-chai-blocks";
// import ReactDOMServer from "react-dom/server";

const SuspenseFallback = () => <div></div>;

export const RenderBlock = (
  props: RenderChaiBlocksProps & {
    repeaterData?: { index: number; dataKey: string };
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
  const { block, lang, fallbackLang, children, externalData, blocks, draft, pageProps, dataProviderMetadataCallback } =
    props;
  const registeredChaiBlock = getRegisteredChaiBlock(block._type);
  const Component = get(registeredChaiBlock, "component", null);
  const index = get(props.repeaterData, "index", -1);
  const dataKey = get(props.repeaterData, "dataKey", "");

  const bindingLangSuffix = lang === fallbackLang ? "" : lang;
  const blockWithBinding: ChaiBlock = applyBindingToBlockProps(
    applyLanguage(block, bindingLangSuffix, registeredChaiBlock),
    externalData,
    { index, key: dataKey },
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
    lang: lang || fallbackLang,
    ...newBlock,
  };
  const isShown = get(newBlock, "_show", true);
  if (isNull(Component) || !isShown) return null;

  if (hasDataProvider) {
    const suspenseFallback = get(registeredChaiBlock, "suspenseFallback", SuspenseFallback) as React.ComponentType<any>;
    return (
      <Suspense fallback={createElement(suspenseFallback)}>
        {/* @ts-ignore */}
        <DataProviderPropsBlock
          lang={lang}
          pageProps={pageProps}
          block={newBlock}
          dataProvider={registeredChaiBlock.dataProvider}
          {...(dataProviderMetadataCallback ? { dataProviderMetadataCallback } : {})}
          draft={draft}>
          {(dataProviderProps) => {
            return createElement(Component, {
              ...blockProps,
              ...dataProviderProps,
              children: children({
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
            });
          }}
        </DataProviderPropsBlock>
      </Suspense>
    );
  }

  // const element = createElement(Component, {
  //   ...blockProps,
  //   children: children({
  //     _id: block._id,
  //     _type: block._type,
  //     ...(isArray(blockWithBinding.repeaterItems)
  //       ? {
  //           repeaterItems: applyLimit(blockWithBinding.repeaterItems, block),
  //           $repeaterItemsKey: blockWithBinding.$repeaterItemsKey,
  //           repeaterTotalItems: blockWithBinding.repeaterTotalItems ?? -1,
  //         }
  //       : {}),
  //   }),
  // });

  // const htmlString = ReactDOMServer.renderToString(element);

  // console.log(htmlString);

  return (
    <Suspense>
      {createElement(Component, {
        ...blockProps,
        children: children({
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
      })}
    </Suspense>
  );
};

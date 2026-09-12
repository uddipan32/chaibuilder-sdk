import React from "react";
import { consumeProviderTags } from "~/server/chai-builder/public/register-cache-tags";
import { ChaiPageProps } from "~/types";
import { ChaiBlock } from "~/types/common";

type DataProvider = (props: {
  draft: boolean;
  inBuilder: boolean;
  lang: string;
  block: ChaiBlock;
  pageProps: ChaiPageProps;
}) => Record<string, any> | Promise<Record<string, any>>;

export default async function DataProviderPropsBlock(props: {
  lang: string;
  pageProps: ChaiPageProps;
  block: ChaiBlock;
  dataProvider: DataProvider;
  draft: boolean;
  children: (dataProviderProps: Record<string, any>) => React.ReactNode;
}) {
  const dataProviderArgs = {
    pageProps: props.pageProps,
    block: props.block,
    lang: props.lang,
    draft: props.draft,
    inBuilder: false,
  };

  // Opt-in build diagnostics: per-block data-provider await timings surface
  // which providers stall CI prebuilds (see LOG_PAGE_BUILD_TIMINGS).
  const logTimings = process.env.LOG_PAGE_BUILD_TIMINGS === "true";
  const awaitStart = performance.now();
  if (logTimings) {
    console.log("[page-build] blockAwaitStart", {
      type: props.block._type,
      id: props.block._id,
      slug: props.pageProps?.slug,
    });
  }
  const dataProps = await props.dataProvider(dataProviderArgs);
  if (logTimings) {
    console.log("[page-build] blockAwaitEnd", {
      type: props.block._type,
      id: props.block._id,
      slug: props.pageProps?.slug,
      ms: Math.round(performance.now() - awaitStart),
    });
  }

  return props.children(await consumeProviderTags(dataProps, !props.draft));
}

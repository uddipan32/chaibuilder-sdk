import React from "react";
import { consumeProviderTags } from "~/server/chai-builder/public/register-cache-tags";
import { ChaiBlock, ChaiPageProps } from "~/types/common";

export default async function AsyncDataProviderPropsBlock(props: {
  lang: string;
  pageProps: ChaiPageProps;
  block: ChaiBlock;
  dataProvider: Promise<Record<string, any>>;
  draft: boolean;
  children: (dataProviderProps: Record<string, any>) => React.ReactNode;
}) {
  const dataProps = await props.dataProvider;
  return props.children(await consumeProviderTags(dataProps, !props.draft));
}

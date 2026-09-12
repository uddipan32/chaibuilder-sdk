import { get } from "lodash-es";
import { useMemo } from "react";
import { useAsyncProps } from "~/builder/hooks/async-props/use-async-props";
import { getRegisteredChaiBlock } from "~/registry";
import { ChaiBlock } from "~/types/common";

type AsyncPropsWrapperProps = {
  children: (asyncProps: Record<string, any>) => React.ReactNode;
  block: ChaiBlock;
};

export const MayBeAsyncPropsWrapper = ({ children, block }: AsyncPropsWrapperProps) => {
  const registeredChaiBlock = useMemo(() => getRegisteredChaiBlock(block._type) as any, [block._type]);
  const dependencies = get(registeredChaiBlock, "dataProviderDependencies");
  const dataProviderFn = get(registeredChaiBlock, "dataProvider");
  const dataProviderMode = get(registeredChaiBlock, "dataProviderMode", "mock");
  const asyncPropsByBlockId = useAsyncProps(block, dataProviderMode, dependencies, dataProviderFn);
  return children(asyncPropsByBlockId);
};

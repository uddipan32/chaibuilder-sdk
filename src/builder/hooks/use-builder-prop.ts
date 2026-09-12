import { useAtomValue } from "jotai";
import { get } from "lodash-es";
import { useMemo } from "react";
import { chaiBuilderPropsAtom } from "~/builder/atoms/builder";
import { ChaiBuilderEditorProps } from "~/types/chaibuilder-editor-props";

type ExcludedBuilderProps = "blocks" | "subPages" | "brandingOptions" | "dataProviders";

export const useBuilderProp = <T>(
  propKey: keyof Omit<ChaiBuilderEditorProps, ExcludedBuilderProps> | "languages" | string,
  defaultValue: T,
): T => {
  const builderProps = useAtomValue(chaiBuilderPropsAtom);
  return useMemo(() => get(builderProps, propKey, defaultValue), [builderProps, propKey, defaultValue]);
};

import { atom, useAtomValue } from "jotai";
import { useMemo } from "react";
import { useBlockRepeaterDataAtom } from "~/builder/hooks/async-props/use-async-props";
import { ChaiBuilderEditorProps } from "~/types";
import { ChaiDesignTokens } from "~/types/types";

export const chaiBuilderPropsAtom = atom<Omit<
  ChaiBuilderEditorProps,
  "blocks" | "globalBlocks" | "brandingOptions"
> | null>(null);
chaiBuilderPropsAtom.debugLabel = "chaiBuilderPropsAtom";

export const chaiExternalDataAtom = atom({});
chaiExternalDataAtom.debugLabel = "chaiExternalDataAtom";

export const chaiRjsfFieldsAtom = atom<Record<string, React.ComponentType<any>>>({});
chaiRjsfFieldsAtom.debugLabel = "chaiRjsfFieldsAtom";

export const chaiRjsfWidgetsAtom = atom<Record<string, React.ComponentType<any>>>({});
chaiRjsfWidgetsAtom.debugLabel = "chaiRjsfWidgetsAtom";

export const chaiRjsfTemplatesAtom = atom<Record<string, React.ComponentType<any>>>({});
chaiRjsfTemplatesAtom.debugLabel = "chaiRjsfTemplatesAtom";

export const chaiPageExternalDataAtom = atom<Record<string, any>>({});
chaiPageExternalDataAtom.debugLabel = "chaiPageExternalDataAtom";

export const chaiDesignTokensAtom = atom<ChaiDesignTokens>({});
chaiDesignTokensAtom.debugLabel = "chaiDesignTokensAtom";

export const usePageExternalData = () => {
  const [blockRepeaterData] = useBlockRepeaterDataAtom();
  const repeaterItems = useMemo(() => {
    const result: Record<string, any> = {};
    Object.entries(blockRepeaterData).forEach(([key, value]) => {
      if (value.status === "loaded" && value.repeaterItems)
        result[value.repeaterItems.replace("}}", `/${key}`).replace("{{", "")] = value.props;
    });
    return result;
  }, [blockRepeaterData]);
  const pageExternalData = useAtomValue(chaiPageExternalDataAtom);
  return useMemo(() => ({ ...pageExternalData, ...repeaterItems }), [pageExternalData, repeaterItems]);
};
export const userActionsCountAtom = atom(0);
export const saveToLibraryModalAtom = atom<{
  isOpen: boolean;
  blockId: string | null;
}>({
  isOpen: false,
  blockId: null,
});

export const makePartialBlockModalAtom = atom<{
  isOpen: boolean;
  blockId: string | null;
}>({
  isOpen: false,
  blockId: null,
});

import { useAtomValue } from "jotai";
import { useMemo } from "react";
import { chaiDesignTokensAtom } from "~/builder/atoms/builder";
import { CHAI_BUILT_IN_DESIGN_TOKENS } from "../../../constants/BUILTIN_TOKENS";

export const useDesignTokens = () => {
  const designTokens = useAtomValue(chaiDesignTokensAtom);
  return useMemo(() => ({ ...CHAI_BUILT_IN_DESIGN_TOKENS, ...designTokens }), [designTokens]);
};

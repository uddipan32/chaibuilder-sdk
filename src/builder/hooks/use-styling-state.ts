import { useAtom } from "jotai";
import { styleStateAtom } from "~/builder/hooks/use-selected-blockIds";

export const useStylingState = () => useAtom(styleStateAtom);

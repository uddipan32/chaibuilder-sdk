import { useAtom } from "jotai";
import { chaiExternalDataAtom } from "~/builder/atoms/builder";

export const useChaiExternalData = () => useAtom(chaiExternalDataAtom);

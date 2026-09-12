import { atom, PrimitiveAtom } from "jotai";

export type AddNewLangState = null | {
  edit: boolean;
  primaryPage: string;
  id?: string;
  preselectedLang?: string;
};

export const addNewLangAtom = atom<AddNewLangState>(null) as PrimitiveAtom<AddNewLangState>;

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { TreeApi } from "react-arborist";
import { defaultThemeValues } from "~/builder/hooks/default-theme-options";
import { ChaiTheme } from "~/types";

export const readOnlyModeAtom: any = atom<boolean>(false);
readOnlyModeAtom.debugLabel = "readOnlyModeAtom";

export const networkModeAtom: any = atom<string>("online");
networkModeAtom.debugLabel = "networkModeAtom";

export const addBlockModalOpenAtom = atom<string>("");

/**
 * @atom
 * Stores the id of the layer that is currently being edited
 */
export const editLayerNameAtom: any = atom(false);
editLayerNameAtom.debugLabel = "editLayerNameAtom";

export const activeLanguageAtom: any = atom("");
activeLanguageAtom.debugLabel = "activeLanguageAtom";

export const primaryLanguageAtom: any = atom("");
primaryLanguageAtom.debugLabel = "primaryLanguageAtom";

export const canvasIframeAtom: any = atom<HTMLIFrameElement | null>(null);
canvasIframeAtom.debugLabel = "canvasIframeAtom";

export const activePanelAtom = atom<string>("outline");
activePanelAtom.debugLabel = "activePanelAtom";

export const showPredefinedBlockCategoryAtom = atom("");
showPredefinedBlockCategoryAtom.debugLabel = "showPredefinedBlockCategoryAtom";

export const draggingFlagAtom = atom(false);
draggingFlagAtom.debugLabel = "draggingFlagAtom";

export const treeRefAtom = atom<TreeApi<any> | null>(null);
treeRefAtom.debugLabel = "treeRefAtom";

export const canvasSettingsAtom = atom({});
canvasSettingsAtom.debugLabel = "canvasSettingsAtom";

export const aiAssistantActiveAtom = atom(false);
aiAssistantActiveAtom.debugLabel = "aiAssistantActiveAtom";

export const codeEditorOpenAtom = atom(false);
codeEditorOpenAtom.debugLabel = "codeEditorOpenAtom";

export const codeEditorHeightAtom = atomWithStorage("codeEditorHeight", 500);
codeEditorHeightAtom.debugLabel = "codeEditorHeightAtom";

export const xShowBlocksAtom = atom<string[]>([]);
xShowBlocksAtom.debugLabel = "xShowBlocksAtom";

export const selectedLibraryAtom = atomWithStorage<string | null>("_selectedLibrary", null);
selectedLibraryAtom.debugLabel = "selectedLibraryAtom";

export const dataBindingActiveAtom = atom(true);
dataBindingActiveAtom.debugLabel = "dataBindingActiveAtom";
export const canvasThemeStorageKey = "chai-builder-canvas-theme";
export const lsThemeAtom = atomWithStorage<ChaiTheme>(canvasThemeStorageKey, defaultThemeValues);

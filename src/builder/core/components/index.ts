import ChaiBuilderCanvas from "~/builder/core/components/canvas/canvas-area";
import BlockPropsEditor from "~/builder/core/components/settings/block-settings";
import BlockStyleEditor from "~/builder/core/components/settings/block-styling";
import AddBlocksPanel from "~/builder/core/components/sidepanels/panels/add-blocks/add-blocks";
import ImportHTML from "~/builder/core/components/sidepanels/panels/add-blocks/import-html";
import UILibrariesPanel from "~/builder/core/components/sidepanels/panels/add-blocks/libraries-panel";
import Outline from "~/builder/core/components/sidepanels/panels/outline/list-tree";
import ThemeOptions from "~/builder/core/components/sidepanels/panels/theme-configuration/theme-config-panel";
import i18n from "~/builder/core/locales/load";

export { AIUserPrompt } from "~/builder/core/components/ask-ai-panel";
export { Breakpoints as ScreenSizes } from "~/builder/core/components/canvas/topbar/canvas-breakpoints";
export { DarkMode as DarkModeSwitcher } from "~/builder/core/components/canvas/topbar/dark-mode";
export { UndoRedo } from "~/builder/core/components/canvas/topbar/undo-redo";
export { ChaiBuilderEditor } from "~/builder/core/components/chaibuilder-editor";
export { AddBlocksDialog } from "~/builder/core/components/layout/add-blocks-dialog";
export { BlockAttributesEditor } from "~/builder/core/components/settings/new-panel/block-attributes-editor";
export { DefaultChaiBlocks } from "~/builder/core/components/sidepanels/panels/add-blocks/default-blocks";
export { default as JSONFormFieldTemplate } from "~/builder/core/rjsf-widgets/json-form-field-template";
export {
  AddBlocksPanel,
  BlockPropsEditor,
  BlockStyleEditor,
  ChaiBuilderCanvas,
  i18n,
  ImportHTML,
  Outline,
  ThemeOptions,
  UILibrariesPanel as UILibraries,
};

export * from "~/types";

import type { ChaiClientPlugin } from "~/builder/register-apis/register-chai-plugin";
import { registerChaiSlot } from "~/builder/register-apis/register-chai-slot";
import { CHAI_SLOT_IDS } from "~/constants/CHAI_SLOT_IDS";
import { DefaultEmptyPageStarterContent } from "./default-empty-page-starter-content";
import { EmptyPageStarterDialogHost } from "./empty-page-starter-dialog-host";

export type EmptyPageStarterMode = "dialog" | "ai" | "template" | "add-block" | "none";
export type EmptyPageStarterOption = "AI" | "BLANK" | "TEMPLATE";

export interface EmptyPageStarterPluginOptions {
  mode?: EmptyPageStarterMode;
  options?: EmptyPageStarterOption[];
}

export const emptyPageStarterClientPlugin: ChaiClientPlugin = {
  name: "chai:empty-page-starter",
  register: () => {
    registerChaiSlot(CHAI_SLOT_IDS.EMPTY_PAGE_STARTER_CONTENT, DefaultEmptyPageStarterContent);
    registerChaiSlot(CHAI_SLOT_IDS.AFTER_BUILDER, EmptyPageStarterDialogHost);
  },
};

import type { ChaiClientPlugin } from "~/builder/register-apis/register-chai-plugin";
import { registerChaiSidebarPanel } from "~/builder/register-apis/register-chai-sidebar-panel";
import { CHAI_SIDEBAR_PANEL_ORDER } from "~/builder/register-apis/sidebar-panel-order";
import { pageErrorsPanel, pageErrorsPanelId } from "./page-errors-panel";

/**
 * Page error detection UI: the errors sidebar panel. The generic
 * `registerChaiStructureCheckRule` API is the core extension point; this plugin
 * surfaces the detected errors in a panel.
 */
export const pageErrorsClientPlugin: ChaiClientPlugin = {
  name: "chai:page-errors",
  register: () => {
    registerChaiSidebarPanel(pageErrorsPanelId, { ...pageErrorsPanel, order: CHAI_SIDEBAR_PANEL_ORDER.PAGE_ERRORS });
  },
};

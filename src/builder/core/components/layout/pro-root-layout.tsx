import { Cross1Icon, LightningBoltIcon } from "@radix-ui/react-icons";
import { find, first, get } from "lodash-es";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import React, {
  ComponentType,
  createElement,
  MouseEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import CanvasArea from "~/builder/core/components/canvas/canvas-area";
import { AddBlocksDialog } from "~/builder/core/components/layout/add-blocks-dialog";
import { LeftPanelContent } from "~/builder/core/components/layout/left-panel-content";
import { NoopComponent } from "~/builder/core/components/noop-component";
import SettingsPanel from "~/builder/core/components/settings/settings-panel";
import ThemeConfigPanel from "~/builder/core/components/sidepanels/panels/theme-configuration/theme-config-panel";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { requestChaiPanelClose } from "~/builder/hooks/use-panel-close-guard";
import { useSidebarActivePanel, useSidebarPanelSwap } from "~/builder/hooks/use-sidebar-active-panel";
import { useActiveSettingsTab, useRightPanel } from "~/builder/hooks/use-theme";
import Tooltip from "~/builder/pages/utils/tooltip";
import { useChaiSidebarPanels } from "~/builder/register-apis";
import { ChaiSlot } from "~/builder/register-apis/register-chai-slot";
import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { TooltipProvider } from "~/components/ui/tooltip";
import { CHAI_SLOT_IDS } from "~/constants/CHAI_SLOT_IDS";
import { isDevelopment } from "~/utils/import-html/general";

const ManageDesignTokens = React.lazy(() => import("../../design-tokens/manage-design-tokens"));

export const DEFAULT_PANEL_WIDTH = 280;

/**
 * RootLayout is a React component that renders the main layout of the application.
 */
const ProRootLayout: ComponentType = () => {
  const [activePanel, setActivePanel] = useSidebarActivePanel();
  const [panelSwap] = useSidebarPanelSwap();
  const [lastStandardPanelId, setLastStandardPanelId] = useState<string | null>("outline");
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const [panel, setRightPanel] = useRightPanel();
  const [, setActiveSettingsTab] = useActiveSettingsTab();
  const topPanels = useChaiSidebarPanels("top");
  const bottomPanels = useChaiSidebarPanels("bottom");

  /**
   * Prevents the context menu from appearing in production mode.
   * @param {MouseEvent<HTMLDivElement>} e - The mouse event.
   */
  const preventContextMenu = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!isDevelopment()) e.preventDefault();
  }, []);

  const totalTopPanels = useMemo(() => {
    const totalTopPanels = [topPanels].flat();
    return totalTopPanels;
  }, [topPanels]);

  const { t } = useTranslation();
  const allPanels = useMemo(() => [...topPanels, ...bottomPanels], [topPanels, bottomPanels]);
  const htmlDir = useBuilderProp("htmlDir", "ltr");

  // Update active panel item and get its width
  const activePanelItem = find(allPanels, (panel) => panel.id === activePanel) ?? first(allPanels);
  const addBlocksPanelItem = find(allPanels, { id: "add-block" });
  const outlinePanelItem = find(allPanels, { id: "outline" });
  const panelWidth = get(activePanelItem, "width", DEFAULT_PANEL_WIDTH);

  // Update last standard panel ID when active panel changes to a standard panel
  useEffect(() => {
    const currentPanelItem = find(allPanels, { id: activePanel });
    const isCurrentPanelStandard = currentPanelItem && get(currentPanelItem, "view", "standard") === "standard";

    if (activePanel !== null && isCurrentPanelStandard) {
      setLastStandardPanelId(activePanel);
    }
  }, [activePanel, allPanels]);

  // Calculate the last standard panel width by finding the most recent standard panel
  const lastStandardPanelWidth = useMemo(() => {
    if (lastStandardPanelId) {
      const lastPanel = find(allPanels, { id: lastStandardPanelId });
      if (lastPanel) {
        return get(lastPanel, "width", DEFAULT_PANEL_WIDTH);
      }
    }
    return DEFAULT_PANEL_WIDTH;
  }, [lastStandardPanelId, allPanels]);

  // Determine the width to use for the left panel
  const leftPanelWidth = useMemo(() => {
    if (activePanel === null) return 0;
    if (isLeftPanelCollapsed) return 0;

    // A drag swaps the panel underneath the pointer. Hold the outgoing panel's
    // width for the whole drag so the canvas never resizes mid-drag.
    if (panelSwap) {
      const swappedOutPanel = find(allPanels, { id: panelSwap });
      if (swappedOutPanel) return get(swappedOutPanel, "width", DEFAULT_PANEL_WIDTH);
    }

    const currentPanelItem = find(allPanels, { id: activePanel });
    const isStandardPanel = get(currentPanelItem, "view", "standard") === "standard";
    const currentPanelWidth = get(currentPanelItem, "width", DEFAULT_PANEL_WIDTH);

    // If current panel is standard, use its width, otherwise use the last standard panel's width
    return isStandardPanel ? currentPanelWidth : lastStandardPanelWidth;
  }, [activePanel, lastStandardPanelWidth, allPanels, isLeftPanelCollapsed, panelSwap]);

  // Determine the width to use for the right panel
  const rightPanelWidth = useMemo(() => {
    if (isRightPanelCollapsed) return 0;
    if (activePanel === "ai") return 0;
    return DEFAULT_PANEL_WIDTH;
  }, [isRightPanelCollapsed, activePanel]);

  const handleMenuItemClick = useCallback(
    (id: string) => {
      const isStandardPanel = get(find(allPanels, { id }), "view", "standard") === "standard";
      if (isStandardPanel) {
        if (activePanel === id) {
          setIsLeftPanelCollapsed((p) => !p);
          return;
        } else if (isLeftPanelCollapsed) {
          setIsLeftPanelCollapsed(false);
        }
      }

      setActivePanel(activePanel === id ? null : id);
    },
    [allPanels, activePanel, setActivePanel, isLeftPanelCollapsed],
  );

  const handleNonStandardPanelClose = useCallback(() => {
    // Return to the last used standard panel when closing a non-standard panel. Panels
    // holding unsaved work can block this and run it themselves once the user decides.
    requestChaiPanelClose(activePanel, () => setActivePanel(lastStandardPanelId ?? "outline"));
  }, [activePanel, setActivePanel, lastStandardPanelId]);

  const closeNonStandardPanel = useCallback(() => {
    setActivePanel("outline");
  }, [setActivePanel]);

  useEffect(() => {
    if (activePanel !== null && !find(allPanels, { id: activePanel })) {
      setActivePanel("outline");
    }
  }, [activePanel, allPanels, setActivePanel]);

  const showPanel = useCallback(
    (id: string) => {
      handleMenuItemClick(id);
    },
    [handleMenuItemClick],
  );

  return (
    <div dir={htmlDir} className="bg-surface h-screen max-h-full w-screen overflow-hidden text-foreground">
      <TooltipProvider>
        <div onContextMenu={preventContextMenu} className="flex h-full max-h-full flex-col">
          <div className="flex h-max w-screen items-center border-b">
            <Suspense>
              <ChaiSlot slotId={CHAI_SLOT_IDS.TOP_BAR} multiple={false} defaultComponent={null} />
            </Suspense>
          </div>
          <main className="relative flex h-[calc(100vh-56px)] max-w-full flex-1 flex-row">
            <div id="sidebar" className="flex w-10 flex-col items-center justify-between bg-background py-1.5">
              <div className="flex flex-col justify-between gap-y-0.5">
                {totalTopPanels.map((item, index) => (
                  <Tooltip key={"button-top-" + index} content={t(item.label)} side="right">
                    <div id={"panel-btn-" + item.id}>
                      {createElement(get(item, "button", NoopComponent), {
                        position: "top",
                        panelId: item.id,
                        isActive: activePanel === item.id,
                        show: () => showPanel(item.id),
                      })}
                    </div>
                  </Tooltip>
                ))}
              </div>
              <div className="flex flex-col space-y-0.5"></div>
              <div className="flex flex-col">
                {bottomPanels?.map((item, index) => {
                  return (
                    <Tooltip key={"button-bottom-" + index} content={t(item.label)} side="right">
                      <div id={"panel-btn-" + item.id}>
                        {createElement(get(item, "button", NoopComponent), {
                          position: "bottom",
                          panelId: item.id,
                          isActive: activePanel === item.id,
                          show: () => showPanel(item.id),
                        })}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
            {/* Side Panel */}
            <motion.div
              id="left-panel"
              className={`relative h-full max-h-full ${isLeftPanelCollapsed ? "border-l" : "border-l dark:border-none"}`}
              initial={{ width: leftPanelWidth }}
              animate={{ width: leftPanelWidth }}
              transition={{ duration: 0.3, ease: "easeInOut" }}>
              {activePanel !== null &&
                get(activePanelItem, "view", "standard") === "standard" &&
                !isLeftPanelCollapsed && (
                  <LeftPanelContent
                    activePanel={activePanel}
                    activePanelItem={activePanelItem}
                    addBlocksPanelItem={addBlocksPanelItem}
                    outlinePanelItem={outlinePanelItem}
                    panelSwap={panelSwap}
                  />
                )}
              {activePanel !== null && (
                <Tooltip content={isLeftPanelCollapsed ? t("Expand") : t("Collapse")} side="right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`absolute -right-4 top-10 z-10 h-7 w-4 rounded-none rounded-r-md border-none p-0 hover:bg-accent ${isLeftPanelCollapsed ? "bg-orange hover:bg-orange/80" : "bg-surface"}`}
                    onClick={() => setIsLeftPanelCollapsed((prev) => !prev)}>
                    {isLeftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </Tooltip>
              )}
            </motion.div>

            <div id="canvas-container" className="flex h-full max-h-full flex-1 flex-col">
              {/* <CanvasTopBar /> */}
              <Suspense>
                <CanvasArea />
              </Suspense>
            </div>
            <motion.div
              id="right-panel"
              className={`relative h-full max-h-full ${isRightPanelCollapsed ? "border-r" : ""}`}
              initial={{
                width: rightPanelWidth,
              }}
              animate={{
                width: rightPanelWidth,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}>
              <Tooltip content={isRightPanelCollapsed ? t("Expand") : t("Collapse")} side="left">
                <Button
                  variant="ghost"
                  size="icon"
                  className={`absolute -left-4 top-10 z-10 h-7 w-4 rounded-none rounded-l-md border-none p-0 hover:bg-accent ${isRightPanelCollapsed ? "bg-orange hover:bg-orange/80" : "bg-surface"}`}
                  onClick={() => setIsRightPanelCollapsed((prev) => !prev)}>
                  {isRightPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </Tooltip>
              <div className="no-scrollbar overflow h-full max-h-full overflow-hidden">
                <div className="flex h-full max-h-full flex-col overflow-hidden p-3">
                  <h2 className="-mt-1 flex items-center space-x-1 text-base font-bold">
                    <div className="flex grow items-center gap-2">
                      <div className="flex w-full items-center justify-between gap-2">
                        {panel === "ai" ? (
                          <>
                            <div className="flex items-center gap-2">
                              <LightningBoltIcon className="rtl:ml-2" /> {t("AI Assistant")}
                            </div>
                          </>
                        ) : panel === "design-tokens" ? (
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className={`flex h-8 items-center space-x-1 truncate text-sm font-medium uppercase`}>
                              {t("Design Tokens")}
                            </div>
                            <Button
                              onClick={() => {
                                setActiveSettingsTab("styles");
                                setRightPanel("block");
                              }}
                              variant="ghost"
                              size="icon-xs"
                              className="text-xs">
                              <Cross1Icon className="h-3 w-3 rtl:ml-2" />
                            </Button>
                          </div>
                        ) : panel === "theme" ? (
                          <div className="flex w-full items-center justify-between gap-2">
                            <div className={`flex h-8 items-center space-x-1 truncate text-sm font-medium uppercase`}>
                              {t("Theme Settings")}
                            </div>
                            <Button
                              onClick={() => setRightPanel("block")}
                              variant="ghost"
                              size="icon-xs"
                              className="text-xs">
                              <Cross1Icon className="h-3 w-3 rtl:ml-2" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </h2>
                  <div className="flex h-full max-h-full w-full">
                    <Suspense fallback={<div className="h-full w-full animate-pulse rounded-md bg-muted/10" />}>
                      {panel === "design-tokens" ? (
                        <React.Suspense fallback={<div className="h-1/2 w-full animate-pulse"></div>}>
                          <ManageDesignTokens />
                        </React.Suspense>
                      ) : panel === "theme" ? (
                        <ThemeConfigPanel />
                      ) : (
                        <SettingsPanel />
                      )}
                    </Suspense>
                  </div>
                </div>
              </div>
            </motion.div>
          </main>
        </div>
        <AddBlocksDialog />
        {/* Drawer View */}
        {activePanel !== null && get(activePanelItem, "view") === "drawer" && (
          <Sheet open={true} onOpenChange={() => handleNonStandardPanelClose()}>
            <SheetContent
              side="left"
              className="flex flex-col gap-0 p-0 sm:max-w-full"
              style={{ width: `${panelWidth}px` }}>
              <SheetHeader className="border-b border-border px-2 py-2.5">
                <SheetTitle className="flex items-center gap-2">
                  <span className="inline-block">{get(activePanelItem, "icon", null)}</span>
                  <span>{t(get(activePanelItem, "label", ""))}</span>
                </SheetTitle>
              </SheetHeader>
              <div className="h-full max-h-full overflow-y-auto p-4">
                <Suspense fallback={<div />}>
                  {React.createElement(get(activePanelItem, "panel", NoopComponent), {
                    close: closeNonStandardPanel,
                  } as any)}
                </Suspense>
              </div>
            </SheetContent>
          </Sheet>
        )}{" "}
        {/* Modal View */}
        {activePanel !== null && get(activePanelItem, "view") === "modal" && (
          <Dialog open={true} onOpenChange={() => handleNonStandardPanelClose()}>
            <DialogContent className="gap-0 p-0" style={{ maxWidth: `${panelWidth}px` }}>
              <DialogHeader className="border-b border-border px-2 py-3.5">
                <DialogTitle className="flex items-center gap-2">
                  <span className="inline-block">{get(activePanelItem, "icon", null)}</span>
                  <span>{t(get(activePanelItem, "label", ""))}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto p-4">
                <Suspense fallback={<div />}>
                  {React.createElement(get(activePanelItem, "panel", NoopComponent), {
                    close: closeNonStandardPanel,
                  } as any)}
                </Suspense>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Overlay View */}
        {activePanel !== null && get(activePanelItem, "view") === "overlay" && (
          <motion.div
            className="absolute bottom-0 left-12 right-0 top-0 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}>
            <div className="h-full w-full">
              <motion.div
                className="bg-surface flex h-full w-full flex-col"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}>
                <div className="flex h-[50px] items-center justify-between border-b border-border p-4">
                  <div className="-ml-2 flex items-center gap-2 text-lg font-bold">
                    <span className="rtl:ml-2 rtl:inline-block">{get(activePanelItem, "icon", null)}</span>
                    <span>{t(get(activePanelItem, "label", ""))}</span>
                  </div>
                  <Button onClick={() => handleNonStandardPanelClose()} variant="ghost" size="icon" className="">
                    <Cross1Icon className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <Suspense fallback={<div />}>
                    {React.createElement(get(activePanelItem, "panel", NoopComponent), {
                      close: closeNonStandardPanel,
                    } as any)}
                  </Suspense>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </TooltipProvider>
    </div>
  );
};

export { ProRootLayout };

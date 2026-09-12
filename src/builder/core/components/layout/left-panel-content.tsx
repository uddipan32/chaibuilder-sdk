import { useAtomValue } from "jotai";
import { get } from "lodash-es";
import { motion } from "motion/react";
import React, { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { dragAndDropAtom } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { NoopComponent } from "~/builder/core/components/noop-component";
import { ChaiSidebarPanel } from "~/builder/register-apis/register-chai-sidebar-panel";

/** Seconds the outgoing panel takes to slide out of the sidebar. */
export const PANEL_SLIDE_OUT_DURATION = 0.18;
/** Seconds the incoming panel takes to slide in, once the outgoing one has left. */
export const PANEL_SLIDE_IN_DURATION = 0.22;

export const OUTGOING_PANEL_TRANSITION = { duration: PANEL_SLIDE_OUT_DURATION, ease: "easeIn" } as const;
/** Delayed by the slide-out, so the two panels never move at the same time. */
export const INCOMING_PANEL_TRANSITION = {
  duration: PANEL_SLIDE_IN_DURATION,
  delay: PANEL_SLIDE_OUT_DURATION,
  ease: "easeOut",
} as const;

type LeftPanelContentProps = {
  activePanel: string | null;
  /** Panel matching `activePanel`, already resolved by the layout. */
  activePanelItem?: ChaiSidebarPanel;
  addBlocksPanelItem?: ChaiSidebarPanel;
  outlinePanelItem?: ChaiSidebarPanel;
  /** Id of the panel the drag is sliding away from, or null when not swapping. */
  panelSwap: string | null;
};

/**
 * One panel filling the sidebar: its heading, if it has one, and its body.
 * Layers stack on top of each other so a swap can cross-slide them.
 */
const PanelLayer = ({ item }: { item?: ChaiSidebarPanel }) => {
  const { t } = useTranslation();
  const label = get(item, "label", "");

  return (
    <div className="no-scrollbar relative flex h-full flex-col overflow-hidden px-3 py-2">
      {label !== "" ? (
        <div
          className={`absolute top-2 flex h-8 items-center space-x-1 text-sm font-medium uppercase ${get(item, "isInternal", false) ? "" : "w-64 max-w-64 truncate"}`}>
          <span>{t(label)}</span>
        </div>
      ) : null}
      <div className={"no-scrollbar h-full max-h-full overflow-y-auto " + (label !== "" ? "pt-10" : "")}>
        <Suspense fallback={<div className="h-full w-full animate-pulse rounded-md bg-muted/10" />}>
          {React.createElement(get(item, "panel", NoopComponent), {})}
        </Suspense>
      </div>
    </div>
  );
};

/**
 * Body of the left sidebar panel.
 *
 * Dragging a new block out of a panel hands the sidebar over to the Outline so
 * the block can be dropped on the tree as well as on the canvas. The handover is
 * sequential: the panel being dragged from slides out first, the Outline slides
 * in behind it. The drag source panel stays mounted (translated out of view, not
 * unmounted) for as long as the drag runs, because tearing the source node out
 * mid-drag cancels the native drag in Chrome.
 */
export const LeftPanelContent = ({
  activePanel,
  activePanelItem,
  addBlocksPanelItem,
  outlinePanelItem,
  panelSwap,
}: LeftPanelContentProps) => {
  const draggedBlock = useAtomValue(dragAndDropAtom);
  const isDraggingNewBlock = !!draggedBlock && !draggedBlock._id;
  const isAddBlocksActive = activePanel === "add-block";
  const isOutlineActive = activePanel === "outline";
  const isSwappingOutAddBlocks = panelSwap === "add-block";
  // Keep the native drag source attached until drop/dragend cleanup completes.
  const keepAddBlocksMounted = isAddBlocksActive || (isDraggingNewBlock && isSwappingOutAddBlocks);

  return (
    <div className="relative h-full max-h-full w-full overflow-hidden">
      {keepAddBlocksMounted && (
        <motion.div
          key="add-block"
          aria-hidden={!isAddBlocksActive}
          className={`absolute inset-0 ${isAddBlocksActive ? "" : "pointer-events-none"}`}
          initial={false}
          animate={isAddBlocksActive ? { x: 0, opacity: 1 } : { x: "-100%", opacity: 0 }}
          // Only the drag handover slides; every other switch is instant.
          transition={isSwappingOutAddBlocks ? OUTGOING_PANEL_TRANSITION : { duration: 0 }}>
          <PanelLayer item={addBlocksPanelItem} />
        </motion.div>
      )}

      {isOutlineActive && (
        <motion.div
          key="outline"
          className="absolute inset-0"
          // `initial` is read once, on mount: the Outline only slides in when it
          // took over from a panel that is sliding out.
          initial={panelSwap ? { x: "-100%", opacity: 0 } : false}
          animate={{ x: 0, opacity: 1 }}
          transition={INCOMING_PANEL_TRANSITION}>
          <PanelLayer item={outlinePanelItem} />
        </motion.div>
      )}

      {!isAddBlocksActive && !isOutlineActive && (
        <div className="absolute inset-0">
          <PanelLayer item={activePanelItem} />
        </div>
      )}
    </div>
  );
};

import { useEffect, useRef } from "react";

/**
 * Guard for non-standard (modal/drawer/overlay) sidebar panels that hold unsaved work.
 *
 * Return `true` to let the close go through. Return `false` to block it — the guard is
 * handed the `proceed` callback so it can run the close later, e.g. once the user picks
 * "discard" or "save" in a confirmation dialog.
 */
export type ChaiPanelCloseGuard = (proceed: () => void) => boolean;

const closeGuards = new Map<string, ChaiPanelCloseGuard>();

/** Runs `proceed` unless the panel registered a guard that blocks the close. */
export const requestChaiPanelClose = (panelId: string | null, proceed: () => void) => {
  const guard = panelId ? closeGuards.get(panelId) : undefined;
  if (guard && !guard(proceed)) return;
  proceed();
};

/**
 * Registers `guard` for `panelId` for as long as the panel is mounted. The latest guard
 * closure is always the one that runs, so it can read current render state directly.
 */
export const useChaiPanelCloseGuard = (panelId: string, guard: ChaiPanelCloseGuard) => {
  const guardRef = useRef(guard);
  guardRef.current = guard;

  useEffect(() => {
    closeGuards.set(panelId, (proceed) => guardRef.current(proceed));
    return () => {
      closeGuards.delete(panelId);
    };
  }, [panelId]);
};

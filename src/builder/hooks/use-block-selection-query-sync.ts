import { useAtomValue } from "jotai";
import { first } from "lodash-es";
import { useEffect, useRef } from "react";
import { presentBlocksAtom } from "~/builder/atoms/blocks";
import { isPageLoadedAtom } from "~/builder/hooks/use-is-page-loaded";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";

const BLOCK_QUERY_PARAM = "bid";

/**
 * Returns the block id from the current URL query parameters.
 */
export function getBlockIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get(BLOCK_QUERY_PARAM);
}

/**
 * Updates the URL query parameter with the given block id.
 * Uses replaceState so it doesn't push to browser history on every selection.
 */
export function updateBlockIdInUrl(blockId: string | null): void {
  const url = new URL(window.location.href);
  if (blockId) {
    url.searchParams.set(BLOCK_QUERY_PARAM, blockId);
  } else {
    url.searchParams.delete(BLOCK_QUERY_PARAM);
  }
  window.history.replaceState({}, "", url.toString());
}

/**
 * Hook that syncs the selected block id with the URL `bid` query parameter.
 *
 * - On page load (once blocks are loaded): reads the `bid` query param and preselects the block.
 * - On block selection change: updates the `bid` query param in the URL.
 */
export const useBlockSelectionQuerySync = () => {
  const [selectedIds, setSelectedIds] = useSelectedBlockIds();
  const blocks = useAtomValue(presentBlocksAtom);
  const isPageLoaded = useAtomValue(isPageLoadedAtom);
  const hasRestoredFromUrl = useRef(false);

  // Reset the one-shot restore guard whenever a new page starts loading
  // (e.g. navigating into a partial/global block). Page changes are SPA
  // (no remount), so without this the `bid` param would only ever restore once.
  useEffect(() => {
    if (!isPageLoaded) {
      hasRestoredFromUrl.current = false;
    }
  }, [isPageLoaded]);

  // On page load, read block id from URL and preselect
  useEffect(() => {
    if (!isPageLoaded || hasRestoredFromUrl.current || blocks.length === 0) return;

    hasRestoredFromUrl.current = true;
    const blockId = getBlockIdFromUrl();
    if (!blockId) return;

    const blockExists = blocks.some((b) => b._id === blockId);
    if (blockExists) {
      setSelectedIds([blockId]);
    } else {
      // Block not found — clean up the stale query param
      updateBlockIdInUrl(null);
    }
  }, [isPageLoaded, blocks, setSelectedIds]);

  // On selection change, update URL
  useEffect(() => {
    // Don't update URL until we've done the initial restore
    if (!hasRestoredFromUrl.current) return;

    const selectedId = first(selectedIds) || null;
    updateBlockIdInUrl(selectedId);
  }, [selectedIds]);
};

import { compact, filter, find, get, isEmpty, uniq } from "lodash-es";
import { useCallback } from "react";
import { useBlocksStore } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { useWebsitePrimaryPages } from "~/builder/pages/hooks/pages/use-project-pages";

export type PartialBlockStatus = "unpublished" | "unpublished_changes";

export interface PartialBlockInfo {
  id: string;
  name: string;
  status: PartialBlockStatus;
}

export const useGetUnpublishedPartialBlocks = () => {
  const [blocksStore] = useBlocksStore();
  const { data: websitePages } = useWebsitePrimaryPages();

  const getUnpublishedPartialBlocks = useCallback(() => {
    // Guard: return empty if websitePages is not loaded yet
    if (!websitePages) {
      return { ids: [], names: [], partialBlocksInfo: [] };
    }

    // Get all blocks with _type === 'PartialBlock'
    const partialBlocks = filter(blocksStore, (block) => block._type === "PartialBlock");
    // Extract unique partialBlockId values
    const partialBlockIds = uniq(compact(partialBlocks.map((block) => get(block, "partialBlockId", ""))));
    // Check which ones are unpublished or have unpublished changes
    const partialBlocksInfo: PartialBlockInfo[] = compact(
      partialBlockIds.map((id) => {
        const page = find(websitePages, { id }) as any;
        if (!page) return null;

        // Determine status
        if (!page.online) {
          return {
            id: page.id,
            name: page.name || page.slug || page.id,
            status: "unpublished" as PartialBlockStatus,
          };
        } else if (!isEmpty(page.changes)) {
          return {
            id: page.id,
            name: page.name || page.slug || page.id,
            status: "unpublished_changes" as PartialBlockStatus,
          };
        }
        return null;
      }),
    );

    const ids = partialBlocksInfo.map((info) => info.id);
    const names = partialBlocksInfo.map((info) => info.name);
    return { ids, names, partialBlocksInfo };
  }, [blocksStore, websitePages]);

  return getUnpublishedPartialBlocks;
};

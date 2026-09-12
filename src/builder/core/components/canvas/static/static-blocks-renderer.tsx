import { useAtom, useAtomValue } from "jotai";
import { hasPageBlocksAtom } from "~/builder/atoms/blocks";
import { canvasRenderKeyAtom } from "~/builder/core/components/canvas/dnd/drag-and-drop/hooks/use-drag-and-drop";
import { PageBlocksRenderer } from "~/builder/core/components/canvas/static/new-blocks-renderer";

export const StaticBlocksRenderer = () => {
  const hasBlocks = useAtomValue(hasPageBlocksAtom);
  const [renderKey] = useAtom(canvasRenderKeyAtom);
  const blocksHtml = !hasBlocks ? null : <PageBlocksRenderer key={renderKey} />;
  return <>{blocksHtml}</>;
};

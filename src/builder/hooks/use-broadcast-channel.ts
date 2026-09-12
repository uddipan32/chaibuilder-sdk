import { useDebouncedCallback } from "@react-hookz/web";
import { each, omit } from "lodash-es";
import { useEffect } from "react";
import { useBlocksStore } from "~/builder/hooks/history/use-blocks-store-undoable-actions";
import { useBuilderProp } from "~/builder/hooks/use-builder-prop";
import { useUpdateBlockAtom } from "~/builder/hooks/use-update-block-atom";

const broadcastChannel = new BroadcastChannel("chaibuilder");
export const useBroadcastChannel = () => {
  const pageId = useBuilderProp("pageId", "chaibuilder_page");
  const postMessage = useDebouncedCallback(
    (message: any) => broadcastChannel.postMessage({ ...message, pageId }),
    [pageId],
    200,
  );

  return { postMessage };
};

export const useUnmountBroadcastChannel = () => {
  const [, setBlocks] = useBlocksStore();
  const pageId = useBuilderProp("pageId", "chaibuilder_page");
  const updateBlockAtom = useUpdateBlockAtom();
  useEffect(() => {
    broadcastChannel.onmessageerror = (event) => {
      console.log("error", event);
    };
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === "blocks-updated" && event.data.pageId === pageId) {
        setBlocks(event.data.blocks);
      }
      if (event.data.type === "blocks-props-updated" && event.data.pageId === pageId) {
        // Apply straight to the block atoms — going through the store manager's
        // updateBlocksProps would re-broadcast the message we just received and
        // ping-pong between tabs forever, bumping the autosave actions count on
        // every hop. Mirrors the raw setBlocks used for "blocks-updated" above.
        each(event.data.blocks, (block: any) => updateBlockAtom({ id: block._id, props: omit(block, "_id") }));
      }
    };
    return () => {
      broadcastChannel.onmessage = null;
      broadcastChannel.onmessageerror = null;
      //broadcastChannel.close();
    };
  }, [setBlocks, pageId, updateBlockAtom]);
};

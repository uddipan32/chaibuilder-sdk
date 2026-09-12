import { useFrame } from "~/builder/core/frame";
import { useKeyEventWatcher } from "~/builder/hooks/use-key-event-watcher";

export const KeyboardHandler = () => {
  const { document: iframeDoc } = useFrame();
  useKeyEventWatcher(iframeDoc);
  return null;
};

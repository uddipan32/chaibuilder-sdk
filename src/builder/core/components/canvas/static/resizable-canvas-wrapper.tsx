import { useDebouncedCallback, useResizeObserver } from "@react-hookz/web";
import { useCallback, useEffect, useRef } from "react";
import { useSelectedBlockIds } from "~/builder/hooks/use-selected-blockIds";
import { useSelectedStylingBlocks } from "~/builder/hooks/use-selected-styling-blocks";

export const ResizableCanvasWrapper = ({ children, onMount, onResize }: any) => {
  const [, setSelected] = useSelectedBlockIds();
  const [, setSelectedStyles] = useSelectedStylingBlocks();
  const mainContentRef = useRef<HTMLDivElement | null>(null);
  const db = useDebouncedCallback(
    () => {
      const { clientWidth } = mainContentRef.current!;
      onResize(clientWidth);
    },
    [onResize],
    100,
  );
  useResizeObserver(mainContentRef, db);
  useEffect(() => {
    const { clientWidth } = mainContentRef.current!;
    onMount(clientWidth);
  }, []);

  const deselectSelected = useCallback(() => {
    setSelected([]);
    setSelectedStyles([]);
  }, [setSelected, setSelectedStyles]);

  return (
    <div
      id={"main-content"}
      onClick={deselectSelected}
      className="h-full w-full border-x-[24px] border-transparent bg-black/50 pb-0 [background-image:radial-gradient(#444_1px,transparent_1px)] [background-size:20px_20px] dark:bg-background/80"
      ref={mainContentRef}>
      {children}
    </div>
  );
};
